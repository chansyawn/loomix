import { notFound } from "@tanstack/react-router";
import type { DishesData } from "./data";
import { loadDishes } from "./data";
import { membershipIndex } from "./query";
import type { View } from "./search";
import type { IngredientCategory } from "@loomix/schema/catalog";
import type { IngredientItem } from "../collection-view";

export function parseDishId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function dishesDetail(data: DishesData, view: View, id: number) {
  const ingredientCategoriesById =
    data.ingredientCategoriesById ?? new Map<number, IngredientCategory>();
  const ingredientItemsById = data.ingredientItemsById ?? new Map<number, IngredientItem>();
  if (view === "items") {
    const item = data.items.find((row) => row.id === id);
    if (!item) throw notFound();
    return {
      kind: "item" as const,
      record: item,
      ingredientCategoriesById,
      ingredientItemsById,
      series: membershipIndex(data.series).get(id) ?? [],
      hasUnconfirmedSeriesMembership: data.series.some((group) => group.dishIds === null),
    };
  }
  const series = data.series.find((row) => row.id === id);
  if (!series) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "series" as const,
    record: series,
    ingredientCategoriesById,
    ingredientItemsById,
    items: series.dishIds === null ? null : series.dishIds.map((dishId) => items.get(dishId)!),
  };
}

export type DishesDetail = ReturnType<typeof dishesDetail>;

export async function loadDishesDetail(view: View, value: string): Promise<DishesDetail> {
  const id = parseDishId(value);
  return dishesDetail(await loadDishes(), view, id);
}
