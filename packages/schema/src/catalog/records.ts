import type { Catalog, CatalogRecord, Group } from "./index.ts";

export function isGroupRecord(record: CatalogRecord): record is CatalogRecord & Group {
  return "memberIds" in record;
}

export function recordCategory(
  record: Pick<CatalogRecord, "type">,
): "furniture" | "clothing" | "creatures" | "plants" | "dishes" | "miscellaneous" {
  switch (record.type) {
    case "furniture":
    case "furniture.set":
      return "furniture";
    case "clothing":
    case "clothing.set":
    case "appearance":
      return "clothing";
    case "creature":
    case "creatures.series":
      return "creatures";
    case "plant":
    case "plants.series":
    case "seed":
      return "plants";
    case "dish":
    case "dishes.series":
      return "dishes";
    case "material":
      return "miscellaneous";
  }
}

export function recordKind(record: CatalogRecord): "item" | "group" | "appearance" | "seed" {
  if (isGroupRecord(record)) return "group";
  if (record.type === "appearance" || record.type === "seed") return record.type;
  return "item";
}

export function resolveItem(catalog: Pick<Catalog, "records" | "references">, id: number) {
  const record = catalog.records.find((record) => record.id === id);
  if (record) return { kind: "record" as const, value: record };
  const reference = catalog.references.find((reference) => reference.id === id);
  return reference ? { kind: "reference" as const, value: reference } : null;
}

export function createTagResolver(catalog: Pick<Catalog, "gameplayTags">) {
  const tags = new Map(catalog.gameplayTags.map((tag) => [tag.id, tag]));
  return (record: CatalogRecord, field: number) => {
    const values = record.gameplayTagGroups.find((group) => group.field === field)?.tagIds ?? [];
    return values
      .map((id) => tags.get(id))
      .filter((tag) => tag !== undefined)
      .map((tag) => tag.displayName ?? tag.name);
  };
}
