import { z } from "zod";
import type { IngredientUsage, IngredientsData } from "../ingredients/model";
import { ingredientUsage } from "../ingredients/model";
import type { PlantGrowth, PlantItem, PlantSeries } from "./model";

export type CropTab = "seed" | `item-${number}`;
export const cropDetailSearchSchema = z.object({
  tab: z
    .string()
    .regex(/^item-[1-9]\d*$/)
    .optional()
    .catch(undefined),
});

export function selectedCropTab(tab: string | undefined, items: readonly PlantItem[]): CropTab {
  const item = items.find((item) => tab === `item-${item.id}`);
  return item ? `item-${item.id}` : "seed";
}

export function matureCropStage(growth: PlantGrowth | null, productId: number) {
  const mature = growth?.matureStages?.find((stage) => stage.productId === productId);
  return growth?.stages?.find((stage) => stage.id === mature?.entityId) ?? null;
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
