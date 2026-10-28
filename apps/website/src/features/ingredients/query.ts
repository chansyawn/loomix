import type { IngredientCategory } from "@loomix/schema/catalog";
import type { IngredientItem } from "../collection-view";
import type { FilterGroup } from "../collection/filter-panel";
import type { IngredientsData } from "./model";
import type { IngredientsQuery } from "./search";

export type IngredientFilterKey = "types" | "colors" | "qualities";

export function ingredientFilterGroups(data: IngredientsData): FilterGroup<IngredientFilterKey>[] {
  return (
    [
      ["types", "食材种类", "type"],
      ["colors", "食材颜色", "color"],
      ["qualities", "食材品质", "quality"],
    ] as const
  ).map(([key, label, dimension]) => ({
    key,
    label,
    options: data.categories
      .filter(
        (category) =>
          data.dimensions.get(category.id) === dimension &&
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
      (!term ||
        [item.name, ...categories.map((category) => category.name)].some((name) =>
          name.toLocaleLowerCase("zh-CN").includes(term),
        )) &&
      [query.types, query.colors, query.qualities].every(
        (selected) =>
          selected.length === 0 ||
          categories.some((category) => selected.includes(String(category.id))),
      )
    );
  });
  const itemIds = new Set(items.map((item) => item.id));
  const categories = active
    ? data.categories.filter(
        (category) =>
          Boolean(term) &&
          data.dimensions.get(category.id) === "type" &&
          category.name.toLocaleLowerCase("zh-CN").includes(term) &&
          category.itemIds.some((id) => itemIds.has(id)),
      )
    : [...data.browseCategories];
  sortRecords(items, query.sort, (item) => data.dishesByItemId.get(item.id)?.length ?? 0);
  sortRecords(
    categories,
    query.sort,
    (category) => data.dishesByCategoryId.get(category.id)?.length ?? 0,
  );
  return { items, categories, active };
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

export function categoryItems(
  data: IngredientsData,
  category: IngredientCategory,
): IngredientItem[] {
  return category.itemIds.flatMap((id) => data.itemsById.get(id) ?? []);
}
