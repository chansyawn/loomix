import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView } from "../omnidex-view.ts";

export type FurnitureData = OmnidexView["furniture"] & {
  ingredientItemsById?: OmnidexView["ingredientItemsById"];
};

export async function loadFurniture(): Promise<FurnitureData> {
  const collection = await loadOmnidexView();
  return { ...collection.furniture, ingredientItemsById: collection.ingredientItemsById };
}
