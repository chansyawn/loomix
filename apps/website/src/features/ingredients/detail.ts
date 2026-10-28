import { notFound } from "@tanstack/react-router";
import { loadCollectionView } from "../collection-loader";
import { buildIngredientsData } from "./model";
import type { IngredientsData } from "./model";
import { categoryItems } from "./query";

export function parseIngredientCategoryId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function ingredientCategoryDetail(data: IngredientsData, id: number) {
  const record = data.categoriesById.get(id);
  if (!record) throw notFound();
  const parents = [];
  const seen = new Set([id]);
  let parentId = record.parentId;
  while (parentId !== null && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = data.categoriesById.get(parentId);
    if (!parent) break;
    parents.unshift(parent);
    parentId = parent.parentId;
  }
  return {
    record,
    parents,
    children: data.categories.filter(
      (category) => category.parentId === id && categoryItems(data, category).length > 0,
    ),
    items: categoryItems(data, record),
    dishes: data.dishesByCategoryId.get(id) ?? [],
    data,
  };
}
export type IngredientCategoryDetail = ReturnType<typeof ingredientCategoryDetail>;

export async function loadIngredientCategoryDetail(
  value: string,
): Promise<IngredientCategoryDetail> {
  const id = parseIngredientCategoryId(value);
  return ingredientCategoryDetail(buildIngredientsData(await loadCollectionView()), id);
}
