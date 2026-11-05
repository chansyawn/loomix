import type { IngredientItem } from "../collection-view";

const itemRoutes = {
  plants: "/collection/plants/items/$id",
  creatures: "/collection/creatures/items/$id",
  miscellaneous: "/collection/miscellany/items/$id",
  furniture: "/collection/furniture/items/$id",
  clothing: "/collection/clothing/items/$id",
  dishes: "/collection/dishes/items/$id",
} as const;

export function cropDetailLocation(seriesId: number, itemId?: number) {
  return {
    to: "/collection/plants/series/$id" as const,
    params: { id: String(seriesId) },
    search: { tab: itemId === undefined ? undefined : (`item-${itemId}` as const) },
  };
}

export function collectionItemLocation(
  item: Pick<IngredientItem, "id" | "catalogCategory" | "cropSeriesId">,
) {
  if (item.catalogCategory === "plants" && item.cropSeriesId != null)
    return cropDetailLocation(item.cropSeriesId, item.id);
  return { to: itemRoutes[item.catalogCategory], params: { id: String(item.id) } };
}
