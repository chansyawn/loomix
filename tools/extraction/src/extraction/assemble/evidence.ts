import { evidenceEntity, evidenceField } from "./validate-evidence.ts";
import type { EvidenceSource, FieldEvidence } from "../evidence/domain-schema.ts";
import type { Dataset } from "@loomix/schema/dataset";
import type { EvidenceRecord as ObservedFieldEvidence } from "../types.ts";
import type { CollectionEvidence } from "../source/catalog/collection/evidence.ts";

// 观察字段到发布字段的映射；未发布的观察字段只保留在提取审计中。
const fields: Record<string, string> = {
  "attributes.type": "furnitureCategory",
  "attributes.size": "size",
  "attributes.effects": "strength",
  "attributes.scientificName": "scientificName",
  subcategory: "category",
  "detail.treeDrops": "drops",
  "detail.creatureSize": "size",
  "detail.dishEffects": "effects",
  "detail.acquisitionConditions": "acquisition",
  "detail.flowerColors": "flowerColors",
};
const itemKinds: Record<string, string> = {
  furniture: "furniture",
  clothing: "clothing",
  creatures: "creature",
  plants: "plant",
  dishes: "dish",
  miscellaneous: "material",
};

interface AuditRecord {
  fieldPath?: string;
  status?: "confirmed" | "absent" | "unresolved";
  reasonCode?: string | null;
  collection: string;
  key: string | number;
  source:
    | { kind?: "table"; file: string; table: number; rowOffset: number; fields: number[] }
    | { kind: "asset"; file: string; pathId: string };
}

const tableSource = (source: {
  file: string;
  table: number;
  rowOffset: number;
  fields: number[];
}): EvidenceSource => ({
  kind: "table",
  file: source.file,
  table: source.table,
  rowOffset: source.rowOffset,
  fields: source.fields,
});
const auditSource = (source: AuditRecord["source"]): EvidenceSource =>
  source.kind === "asset" ? source : tableSource(source);

function classificationOf(group: string): { collection: string; kind: string | null } {
  const [category, kind] = group.split(".");
  if (kind === "set" || kind === "series") return { collection: "catalog.collections", kind: null };
  if (kind === "appearance") return { collection: "catalog.items", kind: "appearance" };
  return { collection: "catalog.items", kind: itemKinds[category!] ?? category! };
}

// 友邻审计记录按友邻实体归并，子数据的路径转为友邻上的字段路径。
function neighborTarget(proof: AuditRecord): { id: string; fieldPath: string } | null {
  const [owner] = String(proof.key).split(":");
  switch (proof.collection) {
    case "neighbors":
      return { id: String(proof.key), fieldPath: proof.fieldPath ?? "$" };
    case "stars":
      return { id: owner!, fieldPath: "stars" };
    case "stories":
      return { id: owner!, fieldPath: "stories" };
    case "giftPreferences":
      return { id: owner!, fieldPath: "gifts" };
    default:
      return null;
  }
}

export function buildDomainEvidence(
  dataset: Dataset,
  observed: ObservedFieldEvidence[],
  details: CollectionEvidence[],
  neighborAudit: AuditRecord[],
) {
  const records = new Map<string, FieldEvidence>();
  const add = (proof: FieldEvidence) => {
    const key = `${proof.entity.collection}:${proof.entity.id}:${proof.fieldPath}`;
    const previous = records.get(key);
    if (previous) {
      if (previous.status !== proof.status) throw new Error(`Conflicting evidence ${key}`);
      proof.sources = [...previous.sources, ...proof.sources];
    }
    records.set(key, proof);
  };
  const published = (collection: string, id: string | number, fieldPath: string) => {
    const entity = evidenceEntity(dataset, collection, id);
    return entity && evidenceField(entity, fieldPath).found ? entity : undefined;
  };
  for (const proof of observed) {
    if (
      proof.field === "encyclopediaEntry" ||
      [
        "attributes.region",
        "attributes.habitat",
        "attributes.activeSeasons",
        "attributes.activeTimes",
        "attributes.activeWeather",
      ].includes(proof.field)
    )
      continue;
    const sources = (proof.sources ?? []).flatMap((source): EvidenceSource[] => {
      if (source.table !== undefined && source.rowOffset !== undefined && source.fields?.length)
        return [
          tableSource({
            file: source.file,
            table: source.table,
            rowOffset: source.rowOffset,
            fields: source.fields,
          }),
        ];
      if (source.pathId) return [{ kind: "asset", file: source.file, pathId: source.pathId }];
      if (source.pointer && source.sha256)
        return [
          { kind: "manual", file: source.file, pointer: source.pointer, sha256: source.sha256 },
        ];
      return [];
    });
    const target = classificationOf(proof.group);
    const classification = proof.field === "category" || proof.field === "kind";
    const fieldPath = classification
      ? target.kind === null
        ? "memberKind"
        : "kind"
      : (fields[proof.field] ?? proof.field.replace(/^attributes\./, ""));
    const entity = published(target.collection, proof.id, fieldPath);
    if (!entity) continue;
    if (target.kind !== null && classification && Reflect.get(entity, "kind") !== target.kind)
      throw new Error(`Classification evidence mismatch ${proof.id}: ${proof.group}`);
    add({
      entity: { collection: target.collection, id: proof.id },
      fieldPath,
      status: proof.status === "confirmed" ? "confirmed" : "unresolved",
      sources,
      ruleId: classification
        ? `client.catalog.classification.${proof.group}`
        : `client.${proof.group}.${proof.field}`,
      reasonCode: proof.reason ?? (proof.status === "unconfirmed" ? "unconfirmed_mapping" : null),
    });
  }
  for (const proof of details) {
    if (proof.field === "detail.id" || proof.owner !== "item") continue;
    const fieldPath = fields[proof.field] ?? proof.field.replace(/^attributes\.|^detail\./, "");
    const entity = published("catalog.items", proof.id, fieldPath);
    if (!entity) continue;
    const requiredKind: Record<string, string> = {
      "detail.creatureSize": "creature",
      "detail.dishEffects": "dish",
      "detail.flowerColors": "plant",
      "detail.treeDrops": "plant",
    };
    const kind = requiredKind[proof.field];
    if (kind && Reflect.get(entity, "kind") !== kind) continue;
    // 外观的获取来源由元数据证据覆盖，详情观察不适用于外观。
    if (fieldPath === "acquisition" && Reflect.get(entity, "kind") === "appearance") continue;
    add({
      entity: { collection: "catalog.items", id: proof.id },
      fieldPath,
      status: proof.status === "confirmed" ? "confirmed" : "unresolved",
      sources: proof.sources.map(tableSource),
      ruleId: `client.${proof.owner}.${proof.field}`,
      reasonCode: proof.reason ?? null,
    });
  }
  for (const proof of neighborAudit) {
    if (proof.fieldPath?.endsWith("image")) continue;
    if (proof.collection === "outfits") {
      const id = Number(proof.key);
      if (published("catalog.items", id, "$"))
        add({
          entity: { collection: "catalog.items", id },
          fieldPath: "$",
          status: "confirmed",
          sources: [auditSource(proof.source)],
          ruleId: "client.catalog.neighborClothing",
          reasonCode: null,
        });
      continue;
    }
    const target = neighborTarget(proof);
    if (!target) continue;
    const entity = published("neighbors.neighbors", target.id, target.fieldPath);
    if (!entity) continue;
    const value = evidenceField(entity, target.fieldPath).value;
    const missingImage =
      proof.status === "confirmed" && target.fieldPath.endsWith("image") && value === null;
    add({
      entity: { collection: "neighbors.neighbors", id: target.id },
      fieldPath: target.fieldPath,
      status: missingImage ? "unresolved" : (proof.status ?? "confirmed"),
      sources: [auditSource(proof.source)],
      ruleId: `client.neighbors.${proof.collection}`,
      reasonCode: missingImage ? "configured_image_not_exported" : (proof.reasonCode ?? null),
    });
  }
  return [...records.values()];
}
