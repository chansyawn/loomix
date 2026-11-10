import type { IngredientItem } from "../collection-view";

export function cropDetailLocation(seriesId: number, itemId?: number) {
  return {
    to: "/collections/records/$id" as const,
    params: { id: String(seriesId) },
    search: { focus: itemId },
  };
}
export function collectionItemLocation(
  item: Pick<IngredientItem, "id" | "catalogCategory" | "cropSeriesId">,
) {
  if (item.catalogCategory === "plants" && item.cropSeriesId != null)
    return cropDetailLocation(item.cropSeriesId, item.id);
  return {
    to: "/collections/records/$id" as const,
    params: { id: String(item.id) },
    search: { focus: undefined },
  };
}
