import { notFound } from "@tanstack/react-router";
import type { CollectionCatalog } from "./catalog";
import { furnitureDetail } from "../furniture/detail";
import { clothingDetail } from "../clothing/detail";
import { creaturesDetail } from "../creatures/detail";
import { plantsDetail } from "../plants/detail";
import { dishesDetail } from "../dishes/detail";
import { buildMiscellanyDetail } from "../miscellany/detail";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import { neighborClothingDetail } from "../neighbor-clothing/detail";
import type { OverviewRecord } from "./catalog";
import type { NeighborClothing } from "@loomix/schema/catalog";

export function parseRecordId(value: string) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null;
}
export function collectionDetail(data: CollectionCatalog, id: number, neighborName?: string) {
  const record = data.byId.get(id);
  if (!record) throw notFound();
  const view = data.view;
  switch (record.record.kind) {
    case "furniture":
    case "furniture.set":
      return {
        category: "furniture" as const,
        detail: furnitureDetail(
          { ...view.furniture, ingredientItemsById: view.ingredientItemsById },
          record.record.kind === "furniture" ? "items" : "sets",
          id,
        ),
      };
    case "clothing":
    case "clothing.set":
    case "appearance":
      return {
        category: "clothing" as const,
        detail: clothingDetail(
          view.clothing,
          record.record.kind === "appearance"
            ? "appearances"
            : record.record.kind === "clothing"
              ? "items"
              : "sets",
          id,
        ),
      };
    case "creature":
    case "creatures.series":
      return {
        category: "creatures" as const,
        detail: creaturesDetail(
          view.creatures,
          record.record.kind === "creature" ? "items" : "series",
          id,
          record.record.kind === "creature"
            ? ingredientUsage(buildIngredientsData(view), id)
            : null,
        ),
      };
    case "plant":
    case "plants.series":
      return {
        category: "plants" as const,
        detail: plantsDetail(
          view.plants,
          record.record.kind === "plant" ? "items" : "series",
          id,
          buildIngredientsData(view),
        ),
      };
    case "dish":
    case "dishes.series":
      return {
        category: "dishes" as const,
        detail: dishesDetail(
          {
            ...view.dishes,
            ingredientItemsById: view.ingredientItemsById,
            ingredientCategoriesById: view.ingredientCategoriesById,
          },
          record.record.kind === "dish" ? "items" : "series",
          id,
        ),
      };
    case "material":
      return { category: "miscellaneous" as const, detail: buildMiscellanyDetail(view, id) };
    case "neighborClothing":
      return {
        category: "neighborClothing" as const,
        detail: neighborClothingDetail(
          record as OverviewRecord & { record: NeighborClothing },
          neighborName,
        ),
      };
    case "seed":
      throw new Error("Seed detail requires canonical resolution");
  }
}
export type RecordDetail = ReturnType<typeof collectionDetail>;
