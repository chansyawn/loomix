import { notFound } from "@tanstack/react-router";
import type { ItemOf } from "@loomix/schema/catalog";
import type { CollectionCatalog, OverviewRecord } from "./catalog";
import { furnitureDetail } from "../furniture/detail";
import { clothingDetail } from "../clothing/detail";
import { clothingCounterpart } from "../clothing/counterpart";
import { creaturesDetail } from "../creatures/detail";
import { plantsDetail } from "../plants/detail";
import { dishesDetail } from "../dishes/detail";
import { buildMiscellanyDetail } from "../miscellany/detail";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import { neighborClothingDetail } from "../neighbor-clothing/detail";
import { setDetailNavigation } from "./detail-navigation-model";

export function parseRecordId(value: string) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null;
}

// 集合按成员种类进入对应图鉴的套组、套装或系列视图。
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
        detail: {
          ...clothingDetail(
            view.clothing,
            collection ? "sets" : kind === "appearance" ? "appearances" : "items",
            id,
          ),
          counterpart:
            kind === "clothing" && !collection ? clothingCounterpart(data.byId, id) : null,
        },
      };
    case "neighborClothing": {
      const counterpart = clothingCounterpart(data.byId, id);
      const navigation = counterpart
        ? setDetailNavigation(view.clothing, counterpart.playerId, "套装")
        : null;
      return {
        category: "clothing" as const,
        detail: {
          ...neighborClothingDetail(
            row as OverviewRecord & { record: ItemOf<"neighborClothing"> },
            neighborName,
          ),
          counterpart,
          navigation:
            counterpart && navigation?.groups.length
              ? { ...navigation, highlightedId: counterpart.playerId }
              : null,
        },
      };
    }
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
  }
}
export type RecordDetail = ReturnType<typeof collectionDetail>;
