import type { Catalog, CatalogRecord, Group } from "./index.ts";

export function isGroupRecord(record: CatalogRecord): record is CatalogRecord & Group {
  return "memberIds" in record;
}

export function recordCategory(
  record: Pick<CatalogRecord, "kind">,
):
  | "furniture"
  | "clothing"
  | "neighborClothing"
  | "creatures"
  | "plants"
  | "dishes"
  | "miscellaneous" {
  switch (record.kind) {
    case "furniture":
    case "furniture.set":
      return "furniture";
    case "clothing":
    case "clothing.set":
    case "appearance":
      return "clothing";
    case "neighborClothing":
      return "neighborClothing";
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

export function resolveItem(catalog: Pick<Catalog, "records" | "references">, id: number) {
  const record = catalog.records.find((record) => record.id === id);
  if (record) return { kind: "record" as const, value: record };
  const reference = catalog.references.find((reference) => reference.id === id);
  return reference ? { kind: "reference" as const, value: reference } : null;
}
