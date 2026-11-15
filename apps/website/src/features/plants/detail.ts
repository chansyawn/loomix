import { notFound } from "@tanstack/react-router";
import type { PlantsData } from "./data";
import { loadCollectionView } from "../collection-loader";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";
import { plantDetailNavigation } from "./detail-navigation-model";
import { plantMatureForms } from "./growth";
import type { View } from "./search";

export function parsePlantId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function plantsDetail(
  data: PlantsData,
  view: View,
  id: number,
  ingredients: IngredientsData | null = null,
) {
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  const navigation = plantDetailNavigation(data, id);
  if (view === "items") {
    const record = itemsById.get(id);
    if (!record) throw notFound();
    const seeds = data.seeds.filter((seed) => seed.plantIds.includes(id));
    return {
      kind: "item" as const,
      record,
      navigation,
      seeds,
      matureForms: plantMatureForms(seeds, id),
      cooking: ingredients ? ingredientUsage(ingredients, id) : null,
      sourceTrees: (data.sourceTreesByItemId.get(id) ?? []).flatMap(
        (tree) => data.itemRefs.get(tree.id) ?? [],
      ),
    };
  }
  if (view === "seeds") {
    const record = data.seeds.find((seed) => seed.id === id);
    if (!record) throw notFound();
    return {
      kind: "seed" as const,
      record,
      navigation,
      items: record.plantIds.flatMap((plantId) => itemsById.get(plantId) ?? []),
    };
  }
  const record = data.series.find((series) => series.id === id);
  if (!record) throw notFound();
  return {
    kind: "series" as const,
    record,
    navigation,
    items: record.plantIds?.flatMap((plantId) => itemsById.get(plantId) ?? []) ?? null,
  };
}

export type PlantsDetail = ReturnType<typeof plantsDetail>;

export async function loadPlantsDetail(view: View, value: string): Promise<PlantsDetail> {
  const id = parsePlantId(value);
  const collection = await loadCollectionView();
  return plantsDetail(
    collection.plants,
    view,
    id,
    view === "items" ? buildIngredientsData(collection) : null,
  );
}
