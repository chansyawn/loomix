import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";
import { buildIngredientsData } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";

export type DishesData = CollectionView["dishes"] &
  Partial<Pick<CollectionView, "ingredientCategoriesById" | "ingredientItemsById">>;

export async function loadDishes(): Promise<DishesData & { ingredients: IngredientsData }> {
  const view = await loadCollectionView();
  return {
    ...view.dishes,
    ingredientCategoriesById: view.ingredientCategoriesById,
    ingredientItemsById: view.ingredientItemsById,
    ingredients: buildIngredientsData(view),
  };
}
