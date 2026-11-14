import { emptyDataset } from "../src/dataset/index.ts";
import type { CatalogRecord } from "../src/catalog/index.ts";
export function recordMetadata(): Pick<
  CatalogRecord,
  "admissionReasons" | "client" | "tagFields" | "tagIds"
> {
  return {
    admissionReasons: ["manual" as const],
    client: { type: 1, idType: 0, subtype: 0, subtypeName: null },
    tagFields: {
      type: [],
      showType: [],
      area: [],
      color: [],
      creature: [],
      material: [],
      style: [],
      property: [],
      size: [],
      ingredients: [],
      foodMaterials: [],
      npcFurnitureCategory: [],
    },
    tagIds: [] as number[],
  };
}

export const datasetFixture: typeof emptyDataset = (...args) => {
  const dataset = emptyDataset(...args);
  dataset.catalog.clientTypes = [{ id: 1, name: null, tagIds: [] }];
  return dataset;
};
