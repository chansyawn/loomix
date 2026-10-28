import path from "node:path";
import { EvidenceSchema } from "../extraction/evidence/domain-schema.ts";
import type { EvidenceSource, FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence as ObservedFieldEvidence } from "../extraction/evidence/schema.ts";
import type { CollectionEvidence } from "../extraction/collection/evidence.ts";
import type { RecordEvidence } from "../extraction/content/admissions.ts";
import { readJson, writeJson } from "../workflow/json.ts";

const fields: Record<string, string> = {
  "attributes.type": "furnitureType",
  "attributes.originGalaxy": "origins",
  "attributes.effects": "effectsText",
  "detail.treeDrops": "drops",
  "detail.creatureSize": "size",
  "detail.creatureGrades": "grades",
  "detail.dishEffects": "effects",
  "detail.acquisitionConditions": "acquisition",
  "detail.growth": "growthId",
};

interface AuditRecord {
  collection: string;
  key: string | number;
  source: Omit<Extract<EvidenceSource, { kind: "table" }>, "kind">;
}

export function buildDomainEvidence(
  dataset: Dataset,
  observed: ObservedFieldEvidence[],
  details: CollectionEvidence[],
  admissions: RecordEvidence[],
  audits: { domain: "neighbors" | "world"; records: AuditRecord[] }[],
) {
  const records = new Map<string, FieldEvidence>();
  const collection = (id: number) =>
    dataset.catalog.items.some((item) => item.id === id)
      ? "catalog.items"
      : dataset.catalog.groups.some((group) => group.id === id)
        ? "catalog.groups"
        : "catalog.appearances";
  const entities = new Map(
    (["items", "groups", "appearances", "seeds", "growths"] as const).flatMap((name) => {
      const entries = dataset.catalog[name];
      return entries.map((entity) => [`catalog.${name}:${entity.id}`, entity] as const);
    }),
  );
  const add = (proof: FieldEvidence) => {
    const key = `${proof.entity.collection}:${proof.entity.id}:${proof.fieldPath}`;
    const previous = records.get(key);
    if (previous && previous.status === proof.status) {
      proof.sources = [
        ...new Map(
          [...previous.sources, ...proof.sources].map((source) => [JSON.stringify(source), source]),
        ).values(),
      ];
    }
    records.set(key, proof);
  };
  for (const proof of observed) {
    if (["category", "kind", "encyclopediaEntry"].includes(proof.field)) continue;
    const sources: EvidenceSource[] = proof.sources.flatMap((source): EvidenceSource[] => {
      if (source.table !== undefined && source.rowOffset !== undefined && source.fields?.length)
        return [
          {
            kind: "table",
            file: source.file,
            table: source.table,
            rowOffset: source.rowOffset,
            fields: source.fields,
          },
        ];
      if (source.pathId) return [{ kind: "asset", file: source.file, pathId: source.pathId }];
      if (source.pointer && source.sha256)
        return [
          { kind: "manual", file: source.file, pointer: source.pointer, sha256: source.sha256 },
        ];
      return [];
    });
    const fieldPath = fields[proof.field] ?? proof.field.replace(/^attributes\./, "");
    const entity = entities.get(`${collection(proof.id)}:${proof.id}`);
    if (!entity || !(fieldPath in entity)) continue;
    add({
      entity: { collection: collection(proof.id), id: proof.id },
      fieldPath,
      status: proof.status === "confirmed" ? "confirmed" : "unresolved",
      sources,
      ruleId: `client.${proof.group}.${proof.field}`,
      reasonCode: proof.reason ?? (proof.status === "unconfirmed" ? "unconfirmed_mapping" : null),
    });
  }
  for (const proof of details) {
    if (proof.field === "seedId" || proof.field === "detail.id") continue;
    const owner = proof.owner === "seed" ? "catalog.seeds" : collection(proof.id);
    const fieldPath = fields[proof.field] ?? proof.field.replace(/^attributes\.|^detail\./, "");
    // Inapplicable source observations do not create fields on the domain entity.
    const entity = entities.get(`${owner}:${proof.id}`);
    const sources: EvidenceSource[] = proof.sources.map(({ file, table, rowOffset, fields }) => ({
      kind: "table",
      file,
      table,
      rowOffset,
      fields,
    }));
    if (
      entity &&
      "growthId" in entity &&
      typeof entity.growthId === "number" &&
      proof.field === "detail.growth"
    ) {
      add({
        entity: { collection: "catalog.growths", id: entity.growthId },
        fieldPath: "$",
        status: proof.status === "confirmed" ? "confirmed" : "unresolved",
        sources,
        ruleId: "client.growth.configuration",
        reasonCode: proof.reason ?? null,
      });
    }
    if (!entity || !(fieldPath in entity)) continue;
    add({
      entity: { collection: owner, id: proof.id },
      fieldPath,
      status: proof.status === "confirmed" ? "confirmed" : "unresolved",
      sources,
      ruleId: `client.${proof.owner}.${proof.field}`,
      reasonCode: proof.reason ?? null,
    });
  }
  for (const proof of admissions) {
    const entry = dataset.catalog.entries.find((entry) => entry.entity.id === proof.id);
    if (!entry) throw new Error(`Missing admitted entity ${proof.id}`);
    const entity = {
      collection: "catalog.entries",
      id: `${entry.entity.kind}:${proof.id}`,
    };
    add({
      entity,
      fieldPath: "entity",
      status: "confirmed",
      sources: proof.admissionSources.map((source) =>
        source.kind === "manual"
          ? source
          : {
              kind: "table",
              file: source.file,
              table: source.table,
              rowOffset: source.rowOffset,
              fields: [0],
            },
      ),
      ruleId: "client.catalog.admission",
      reasonCode: null,
    });
    const encyclopedia = proof.encyclopedia;
    add({
      entity,
      fieldPath: "encyclopedia",
      status: encyclopedia.state === "present" ? "confirmed" : "absent",
      sources: [
        encyclopedia.state === "present"
          ? {
              kind: "table",
              file: encyclopedia.file,
              table: encyclopedia.table,
              rowOffset: encyclopedia.rowOffset,
              fields: [0, 1],
            }
          : { kind: "tableScan", file: encyclopedia.file, table: encyclopedia.table },
      ],
      ruleId: "client.catalog.encyclopedia",
      reasonCode: encyclopedia.state === "absent" ? "not_in_complete_encyclopedia_table" : null,
    });
  }
  for (const { domain, records: audit } of audits) {
    for (const proof of audit) {
      const name = proof.collection === "assets" ? "resources" : proof.collection;
      const values: unknown = Reflect.get(dataset[domain], name);
      if (!Array.isArray(values)) continue;
      let key = proof.key;
      if (name === "stories") key = String(key).split(":").slice(0, 2).join(":");
      const entity: unknown = values.find((value: unknown) => {
        if (!value || typeof value !== "object") return false;
        return ["key", "id", "path", "itemId"].some(
          (field) => String(Reflect.get(value, field)) === String(key),
        );
      });
      if (!entity) continue;
      add({
        entity: { collection: `${domain}.${name}`, id: key },
        fieldPath: "$",
        status: "confirmed",
        sources: [{ kind: "table", ...proof.source }],
        ruleId: `client.${domain}.${name}`,
        reasonCode: null,
      });
    }
  }
  return EvidenceSchema.parse({
    ...dataset.context,
    kind: "evidence",
    fields: [...records.values()].sort((a, b) =>
      `${a.entity.collection}:${a.entity.id}:${a.fieldPath}`.localeCompare(
        `${b.entity.collection}:${b.entity.id}:${b.fieldPath}`,
        "en",
      ),
    ),
  });
}

export function readDomainEvidence(work: string, dataset: Dataset) {
  return buildDomainEvidence(
    dataset,
    [
      ...readJson<ObservedFieldEvidence[]>(path.join(work, "evidence/field-evidence.json")),
      ...readJson<ObservedFieldEvidence[]>(path.join(work, "evidence/missing-fields.json")),
    ],
    readJson<CollectionEvidence[]>(path.join(work, "collection-evidence.json")),
    readJson<RecordEvidence[]>(path.join(work, "record-evidence.json")),
    [
      {
        domain: "neighbors",
        records: readJson<{ records: AuditRecord[] }>(path.join(work, "neighbor-audit.json"))
          .records,
      },
      {
        domain: "world",
        records: readJson<{ records: AuditRecord[] }>(path.join(work, "island-audit.json")).records,
      },
    ],
  );
}

export function writeDomainEvidence(work: string, dataset: Dataset): void {
  writeJson(path.join(work, "evidence/domain-fields.json"), readDomainEvidence(work, dataset));
}
