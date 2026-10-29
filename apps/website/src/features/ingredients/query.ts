import type { IngredientItem } from "../collection-view";
import type { FilterGroup } from "../collection/filter-panel";
import type { IngredientsData } from "./model";
import type { IngredientFilterKey, IngredientsQuery } from "./search";

export function ingredientFilterGroups(data: IngredientsData): FilterGroup<IngredientFilterKey>[] {
  return (
    [
      ["types", "食材种类", ["type", "group"]],
      ["colors", "食材颜色", ["color"]],
      ["qualities", "食材品质", ["quality"]],
    ] as const
  ).map(([key, label, dimension]) => ({
    key,
    label,
    options: data.categories
      .filter(
        (category) =>
          dimension.some((value) => value === data.dimensions.get(category.id)) &&
          category.tagName !== "食材" &&
          !["食材_颜色", "食材_品阶"].includes(category.tagName) &&
          category.itemIds.some((id) => data.itemsById.has(id)),
      )
      .map((category) => ({ value: String(category.id), label: category.name })),
  }));
}

export function queryIngredients(data: IngredientsData, query: IngredientsQuery) {
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const active = Boolean(
    term || query.types.length || query.colors.length || query.qualities.length,
  );
  const items = [...data.itemsById.values()].filter((item) => {
    const categories = data.categoriesByItemId.get(item.id) ?? [];
    return (
      (!term || item.name.toLocaleLowerCase("zh-CN").includes(term)) &&
      [query.types, query.colors, query.qualities].every(
        (selected) =>
          selected.length === 0 ||
          categories.some((category) => selected.includes(String(category.id))),
      )
    );
  });
  sortRecords(items, query.sort, (item) => data.dishesByItemId.get(item.id)?.length ?? 0);
  return { items, active };
}

function sortRecords<T extends Pick<IngredientItem, "id" | "name">>(
  records: T[],
  sort: IngredientsQuery["sort"],
  recipeCount: (record: T) => number,
): void {
  if (sort === "original") return;
  records.sort((a, b) =>
    sort === "recipes-desc"
      ? recipeCount(b) - recipeCount(a) || a.name.localeCompare(b.name, "zh-CN")
      : (sort === "name-desc" ? -1 : 1) * a.name.localeCompare(b.name, "zh-CN"),
  );
}
