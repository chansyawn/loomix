import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView, IngredientItem } from "../collection-view.ts";
import { buildIngredientsData } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";
import type { IngredientTagSource } from "../ingredients/tag-source";

export type DishesData = CollectionView["dishes"] & {
  ingredientTagSource: IngredientTagSource;
  ingredientItemsById: ReadonlyMap<number, IngredientItem>;
};
export type DishesBrowserData = DishesData & { ingredients: IngredientsData };

export async function loadDishes(): Promise<DishesBrowserData> {
  const view = await loadCollectionView();
  return {
    ...view.dishes,
    ingredientTagSource: view.ingredientTagSource,
    ingredientItemsById: view.ingredientItemsById,
    ingredients: buildIngredientsData(view),
  };
}
