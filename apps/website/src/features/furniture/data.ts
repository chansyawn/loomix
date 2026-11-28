import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView } from "../omnidex-view.ts";

export type FurnitureData = OmnidexView["furniture"] & {
  ingredientItemsById?: OmnidexView["ingredientItemsById"];
  sourceTreesByItemId?: OmnidexView["plants"]["sourceTreesByItemId"];
};

export function furnitureDetailData(collection: OmnidexView): FurnitureData {
  return {
    ...collection.furniture,
    ingredientItemsById: collection.ingredientItemsById,
    sourceTreesByItemId: collection.plants.sourceTreesByItemId,
  };
}

export async function loadFurniture(): Promise<FurnitureData> {
  return furnitureDetailData(await loadOmnidexView());
}
