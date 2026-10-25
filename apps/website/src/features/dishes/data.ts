import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type DishesData = CollectionView["dishes"] &
  Partial<Pick<CollectionView, "ingredientCategoriesById" | "ingredientItemsById">>;

export async function loadDishes(): Promise<DishesData> {
  const view = await loadCollectionView();
  return {
    ...view.dishes,
    ingredientCategoriesById: view.ingredientCategoriesById,
    ingredientItemsById: view.ingredientItemsById,
  };
}
