import { notFound } from "@tanstack/react-router";
import type { ItemOf } from "@loomix/schema/catalog";
import type { OmnidexCatalog, CatalogEntryRow } from "./catalog";
import { furnitureDetail } from "../furniture/detail";
import { furnitureDetailData } from "../furniture/data";
import { clothingDetail } from "../clothing/detail";
import { clothingCounterpart } from "../clothing/counterpart";
import { creaturesDetail, simpleEncounterSummary } from "../creatures/detail";
import { plantsDetail } from "../plants/detail";
import { dishesDetail } from "../dishes/detail";
import { buildMiscellaneousDetail } from "../miscellaneous/detail";
import { ingredientUsage } from "../ingredients/model";
import { neighborOutfitDetail } from "../neighbor-outfit/detail";
import { setDetailNavigation } from "./detail-navigation-model";

export function parseCatalogEntryId(value: string) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null;
}

// 集合按成员种类进入对应图鉴的套组、套装或系列视图。
function detailKind(row: CatalogEntryRow) {
  const { record } = row;
  return "memberKind" in record
    ? ({ kind: record.memberKind, collection: true } as const)
    : ({ kind: record.kind, collection: false } as const);
}

export function catalogEntryDetail(data: OmnidexCatalog, id: number) {
  const row = data.byId.get(id);
  if (!row) throw notFound();
  const view = data.view;
  const { kind, collection } = detailKind(row);
  switch (kind) {
    case "furniture":
      return {
        category: "furniture" as const,
        detail: furnitureDetail(furnitureDetailData(view), collection ? "sets" : "items", id),
      };
    case "clothing":
    case "appearance":
      return {
        category: "clothing" as const,
        detail: {
          ...clothingDetail(
            view.clothing,
            collection ? "outfits" : kind === "appearance" ? "appearances" : "items",
            id,
          ),
          counterpart:
            kind === "clothing" && !collection ? clothingCounterpart(data.byId, id) : null,
        },
      };
    case "neighborOutfit": {
      const counterpart = clothingCounterpart(data.byId, id);
      const navigation = counterpart
        ? setDetailNavigation(
            { items: view.clothing.items, sets: view.clothing.outfits },
            counterpart.playerId,
            "套装",
          )
        : null;
      return {
        category: "clothing" as const,
        detail: {
          ...neighborOutfitDetail(row as CatalogEntryRow & { record: ItemOf<"neighborOutfit"> }),
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
        encounterSummary:
          "kind" in row.record && row.record.kind === "creature"
            ? simpleEncounterSummary(row.record)
            : null,
        detail: creaturesDetail(
          view.creatures,
          collection ? "series" : "items",
          id,
          collection ? null : ingredientUsage(data.ingredients, id),
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
          kind === "plant" && !collection ? data.ingredients : null,
        ),
      };
    case "cropPlant":
    case "flowerPlant":
      return {
        category: "plants" as const,
        detail: plantsDetail(view.plants, "harvestablePlants", id),
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
      return {
        category: "miscellaneous" as const,
        detail: buildMiscellaneousDetail(view, id, data.ingredients),
      };
  }
}
export type CatalogEntryDetail = ReturnType<typeof catalogEntryDetail>;
