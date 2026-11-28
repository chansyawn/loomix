import { notFound } from "@tanstack/react-router";
import type { PlantsData } from "./data";
import { loadOmnidexView } from "../omnidex-loader";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";
import { plantDetailNavigation } from "./detail-navigation-model";
import { plantMatureForms } from "./growth";
import type { View } from "./search";
import type { FlowerHybridizationSeries, PlantItem, PlantSeries } from "./model";

function flowerHybridizationSeries(
  series: PlantSeries,
  itemsById: ReadonlyMap<number, PlantItem>,
): FlowerHybridizationSeries[] {
  if (!series.flowerHybridization) return [];
  const members = [...new Set(series.plantIds)].flatMap((id) => {
    const item = itemsById.get(id);
    return item?.category === "花" ? [{ id, name: item.name, image: item.image }] : [];
  });
  const memberIds = new Set(members.map(({ id }) => id));
  const recipes = series.flowerHybridization.filter(
    ({ parentItemIds, productItemId }) =>
      memberIds.has(productItemId) && parentItemIds.every((id) => memberIds.has(id)),
  );
  return recipes.length ? [{ id: series.id, name: series.name, members, recipes }] : [];
}

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
  if (view === "harvestablePlants") {
    const record = data.harvestablePlants.find((stock) => stock.id === id);
    if (!record) throw notFound();
    return { kind: "harvestablePlant" as const, record };
  }
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
      matureForms: plantMatureForms(seeds, id),
      cooking: ingredients ? ingredientUsage(ingredients, id) : null,
      sourceTrees: (data.sourceTreesByItemId.get(id) ?? []).flatMap(
        (tree) => data.itemRefs.get(tree.id) ?? [],
      ),
      hybridization:
        record.category === "花"
          ? data.series
              .filter((series) => series.plantIds?.includes(id))
              .sort((left, right) => left.id - right.id)
              .flatMap((series) => flowerHybridizationSeries(series, itemsById))
          : [],
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
    hybridization: flowerHybridizationSeries(record, itemsById),
  };
}

export type PlantsDetail = ReturnType<typeof plantsDetail>;

export async function loadPlantsDetail(view: View, value: string): Promise<PlantsDetail> {
  const id = parsePlantId(value);
  const collection = await loadOmnidexView();
  return plantsDetail(
    collection.plants,
    view,
    id,
    view === "items" ? buildIngredientsData(collection) : null,
  );
}
