import { notFound } from "@tanstack/react-router";
import type { ItemOf } from "@loomix/schema/catalog";
import type { CollectionCatalog, OverviewRecord } from "./catalog";
import { furnitureDetail } from "../furniture/detail";
import { clothingDetail } from "../clothing/detail";
import { creaturesDetail } from "../creatures/detail";
import { plantsDetail } from "../plants/detail";
import { dishesDetail } from "../dishes/detail";
import { buildMiscellanyDetail } from "../miscellany/detail";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import { neighborClothingDetail } from "../neighbor-clothing/detail";

export function parseRecordId(value: string) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null;
}

// 合集按成员种类进入对应图鉴的合集视图。
function detailKind(row: OverviewRecord) {
  const { record } = row;
  return "memberKind" in record
    ? ({ kind: record.memberKind, collection: true } as const)
    : ({ kind: record.kind, collection: false } as const);
}

export function collectionDetail(data: CollectionCatalog, id: number, neighborName?: string) {
  const row = data.byId.get(id);
  if (!row) throw notFound();
  const view = data.view;
  const { kind, collection } = detailKind(row);
  switch (kind) {
    case "furniture":
      return {
        category: "furniture" as const,
        detail: furnitureDetail(
          { ...view.furniture, ingredientItemsById: view.ingredientItemsById },
          collection ? "sets" : "items",
          id,
        ),
      };
    case "clothing":
    case "appearance":
      return {
        category: "clothing" as const,
        detail: clothingDetail(
          view.clothing,
          collection ? "sets" : kind === "appearance" ? "appearances" : "items",
          id,
        ),
      };
    case "creature":
      return {
        category: "creatures" as const,
        detail: creaturesDetail(
          view.creatures,
          collection ? "series" : "items",
          id,
          collection ? null : ingredientUsage(buildIngredientsData(view), id),
        ),
      };
    case "plant":
    case "seed":
      return {
        category: "plants" as const,
        detail: plantsDetail(
          view.plants,
          collection ? "series" : kind === "seed" ? "seeds" : "items",
          id,
          kind === "plant" && !collection ? buildIngredientsData(view) : null,
        ),
      };
    case "dish":
      return {
        category: "dishes" as const,
        detail: dishesDetail(
          {
            ...view.dishes,
            ingredientItemsById: view.ingredientItemsById,
            ingredientTagSource: view.ingredientTagSource,
          },
          collection ? "series" : "items",
          id,
        ),
      };
    case "material":
      return { category: "miscellaneous" as const, detail: buildMiscellanyDetail(view, id) };
    case "neighborClothing":
      return {
        category: "neighborClothing" as const,
        detail: neighborClothingDetail(
          row as OverviewRecord & { record: ItemOf<"neighborClothing"> },
          neighborName,
        ),
      };
  }
}
export type RecordDetail = ReturnType<typeof collectionDetail>;
