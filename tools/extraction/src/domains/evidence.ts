import { validateDomainEvidence } from "./validate-evidence.ts";
import { metadataEvidence } from "./metadata-evidence.ts";
import { plantingDomainEvidence } from "../extraction/plants/evidence.ts";
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
};

interface AuditRecord {
  collection: string;
  key: string | number;
  source:
    | { kind?: "table"; file: string; table: number; rowOffset: number; fields: number[] }
    | { kind: "asset"; file: string; pathId: string };
}

export function buildDomainEvidence(
  dataset: Dataset,
  observed: ObservedFieldEvidence[],
  details: CollectionEvidence[],
  _admissions: RecordEvidence[],
  audits: { domain: "neighbors" | "world"; records: AuditRecord[] }[],
) {
  const records = new Map<string, FieldEvidence>();
  const collection = (_id: number) => "catalog.records";
  const entities = new Map<string, object>(
    (["records", "references", "growths"] as const).flatMap((name) =>
      dataset.catalog[name].map((entity) => [`catalog.${name}:${entity.id}`, entity] as const),
    ),
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
    if (proof.field === "detail.id") continue;
    const owner = collection(proof.id);
    const fieldPath = fields[proof.field] ?? proof.field.replace(/^attributes\.|^detail\./, "");
    // 不适用的来源观测记录不会在领域实体上创建字段。
    const entity = entities.get(`${owner}:${proof.id}`);
    if (
      fieldPath === "acquisition" &&
      entity &&
      ("memberIds" in entity || ("type" in entity && entity.type === "appearance"))
    )
      continue;
    const sources: EvidenceSource[] = proof.sources.map(({ file, table, rowOffset, fields }) => ({
      kind: "table",
      file,
      table,
      rowOffset,
      fields,
    }));
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
        sources: [
          proof.source.kind === "asset" ? proof.source : { kind: "table", ...proof.source },
        ],
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
  const evidence = buildDomainEvidence(
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
  evidence.fields.push(...metadataEvidence(work, dataset));
  evidence.fields.push(...plantingDomainEvidence(work, dataset));
  return EvidenceSchema.parse({
    ...evidence,
    fields: validateDomainEvidence(dataset, evidence.fields),
  });
}

export function writeDomainEvidence(work: string, dataset: Dataset): void {
  writeJson(path.join(work, "evidence/domain-fields.json"), readDomainEvidence(work, dataset));
}
