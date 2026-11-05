import { notFound } from "@tanstack/react-router";
import type { PlantsData } from "./data";
import { loadCollectionView } from "../collection-loader";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";
import { membershipIndex } from "./query";
import { cropSeriesDetail } from "./crop-detail";
import type { View } from "./search";

export function parsePlantId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function plantsDetail(
  data: PlantsData,
  view: Exclude<View, "seeds">,
  id: number,
  ingredients: IngredientsData | null = null,
) {
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  if (view === "items") {
    const item = itemsById.get(id);
    if (!item || item.category === "作物") throw notFound();
    const series = membershipIndex(data.series).get(id) ?? [];
    return {
      kind: "item" as const,
      record: item,
      cooking: ingredients ? ingredientUsage(ingredients, id) : null,
      series,
      relatedGroups: series.map((group) => ({
        series: group,
        items:
          group.plantIds?.flatMap((memberId) =>
            memberId !== id && itemsById.has(memberId) ? [itemsById.get(memberId)!] : [],
          ) ?? [],
      })),
      sourceTrees: (data.sourceTreesByItemId.get(id) ?? []).flatMap(
        (tree) => data.itemRefs.get(tree.id) ?? [],
      ),
      itemRefs: data.itemRefs,
      hasUnconfirmedSeriesMembership: data.series.some((group) => group.plantIds === null),
    };
  }
  const series = data.series.find((row) => row.id === id);
  if (!series) throw notFound();
  const items = series.plantIds?.flatMap((id) => itemsById.get(id) ?? []) ?? null;
  if (items?.some((item) => item.category === "作物"))
    return cropSeriesDetail(series, items, ingredients);
  return {
    kind: "series" as const,
    record: series,
    items,
    itemRefs: data.itemRefs,
  };
}

export type PlantsDetail = ReturnType<typeof plantsDetail>;

export async function loadPlantsDetail(
  view: Exclude<View, "seeds">,
  value: string,
): Promise<PlantsDetail> {
  const id = parsePlantId(value);
  const collection = await loadCollectionView();
  const needsCooking =
    (view === "items" && collection.plants.items.some((item) => item.id === id)) ||
    (view === "series" &&
      collection.plants.series
        .find((series) => series.id === id)
        ?.summary.categories.includes("作物"));
  return plantsDetail(
    collection.plants,
    view,
    id,
    needsCooking ? buildIngredientsData(collection) : null,
  );
}
