import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../evidence/domain-schema.ts";

// 证据只能指向发布数据中实际存在的实体；友邻子数据均通过友邻实体的字段路径定位。
export const evidenceCollections = {
  "catalog.items": (dataset: Dataset) => dataset.catalog.items,
  "catalog.collections": (dataset: Dataset) => dataset.catalog.collections,
  "catalog.creationCardSets": (dataset: Dataset) => dataset.catalog.creationCardSets,
  "neighbors.neighbors": (dataset: Dataset) => dataset.neighbors.neighbors,
  "gameplayTags.tags": (dataset: Dataset) => dataset.gameplayTags.tags,
  "starsea.regions": (dataset: Dataset) => dataset.starsea.regions,
  "starsea.islands": (dataset: Dataset) => dataset.starsea.islands,
  "starsea.iconStyles": (dataset: Dataset) => dataset.starsea.iconStyles,
  "vignettes.templates": (dataset: Dataset) => dataset.vignettes.templates,
  "vignettes.fallbackItems": (dataset: Dataset) => dataset.vignettes.fallbackItems,
} as const;
export type EvidenceCollection = keyof typeof evidenceCollections;

export function evidenceEntity(
  dataset: Dataset,
  collection: string,
  id: string | number,
): object | undefined {
  const entries = Reflect.get(evidenceCollections, collection) as
    | ((dataset: Dataset) => readonly { id: number }[])
    | undefined;
  return entries?.(dataset).find((entry) => String(entry.id) === String(id));
}

export function evidenceField(
  entity: object,
  fieldPath: string,
): { found: boolean; value: unknown } {
  if (fieldPath === "$") return { found: true, value: entity };
  let value: unknown = entity;
  for (const segment of fieldPath.split(".")) {
    if (!value || typeof value !== "object" || !(segment in value))
      return { found: false, value: undefined };
    value = Reflect.get(value, segment);
  }
  return { found: true, value };
}

const sourceKey = (source: FieldEvidence["sources"][number]) => JSON.stringify(source);
const uniqueSources = (sources: FieldEvidence["sources"]) => [
  ...new Map(sources.map((source) => [sourceKey(source), source])).values(),
];

export function validateDomainEvidence(dataset: Dataset, fields: FieldEvidence[]): FieldEvidence[] {
  const merged = new Map<string, FieldEvidence>();
  for (const proof of fields) {
    const { collection, id } = proof.entity;
    const entity = evidenceEntity(dataset, collection, id);
    if (!entity) throw new Error(`Unknown evidence entity ${collection}:${id}`);
    if (!evidenceField(entity, proof.fieldPath).found)
      throw new Error(`Unknown evidence field ${collection}:${id}.${proof.fieldPath}`);
    const key = `${collection}:${id}:${proof.fieldPath}`;
    const previous = merged.get(key);
    if (previous) {
      if (previous.status !== proof.status) throw new Error(`Conflicting evidence status ${key}`);
      previous.sources = uniqueSources([...previous.sources, ...proof.sources]);
    } else merged.set(key, { ...proof, sources: uniqueSources(proof.sources) });
  }
  return [...merged.values()].sort((a, b) =>
    `${a.entity.collection}:${a.entity.id}:${a.fieldPath}`.localeCompare(
      `${b.entity.collection}:${b.entity.id}:${b.fieldPath}`,
      "en",
    ),
  );
}
