import type { IngredientItem } from "../collection-view";

const itemRoutes = {
  plants: "/collection/plants/items/$id",
  creatures: "/collection/creatures/items/$id",
  miscellaneous: "/collection/miscellany/items/$id",
  furniture: "/collection/furniture/items/$id",
  clothing: "/collection/clothing/items/$id",
  dishes: "/collection/dishes/items/$id",
} as const;

export function collectionItemLocation(item: Pick<IngredientItem, "id" | "catalogCategory">) {
  return { to: itemRoutes[item.catalogCategory], params: { id: String(item.id) } };
}
