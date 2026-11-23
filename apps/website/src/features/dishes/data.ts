import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView, IngredientItem } from "../omnidex-view.ts";
import { buildIngredientsData } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";
import type { IngredientTagSource } from "../ingredients/tag-source";

export type DishesData = OmnidexView["dishes"] & {
  ingredientTagSource: IngredientTagSource;
  ingredientItemsById: ReadonlyMap<number, IngredientItem>;
};
export type DishesBrowserData = DishesData & { ingredients: IngredientsData };

export async function loadDishes(): Promise<DishesBrowserData> {
  const view = await loadOmnidexView();
  return {
    ...view.dishes,
    ingredientTagSource: view.ingredientTagSource,
    ingredientItemsById: view.ingredientItemsById,
    ingredients: buildIngredientsData(view),
  };
}
