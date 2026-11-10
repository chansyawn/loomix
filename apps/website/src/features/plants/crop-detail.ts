import type { IngredientUsage, IngredientsData } from "../ingredients/model";
import { ingredientUsage } from "../ingredients/model";
import type { PlantGrowth, PlantItem, PlantSeries } from "./model";

export type CropTab = "seed" | `item-${number}`;
export function selectedCropTab(tab: string | undefined, items: readonly PlantItem[]): CropTab {
  const item = items.find((item) => tab === `item-${item.id}`);
  return item ? `item-${item.id}` : "seed";
}

export function matureCropStage(growth: PlantGrowth | null, productId: number) {
  if (!growth || growth.kind !== "crop") return null;
  const matureIds = new Set(growth.matureStages.map((stage) => stage.stageId));
  return (
    growth.stages.find((stage) => matureIds.has(stage.id) && stage.plantId === productId) ?? null
  );
}

export function cropSeriesDetail(
  record: PlantSeries,
  items: PlantItem[],
  ingredients: IngredientsData | null,
) {
  const cookingByItemId = new Map<number, IngredientUsage | null>(
    items.map((item) => [item.id, ingredients ? ingredientUsage(ingredients, item.id) : null]),
  );
  return {
    kind: "crop" as const,
    record,
    items,
    seeds: record.summary.seeds,
    cookingByItemId,
  };
}

export type CropDetail = ReturnType<typeof cropSeriesDetail>;
