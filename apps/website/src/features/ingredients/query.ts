import { createNameMatcher } from "@/infrastructure/name-search";
import type { IngredientItem } from "../collection-view";
import type { FilterGroup } from "../collection/filter-panel";
import type { IngredientsData } from "./model";
import type { IngredientsQuery } from "./search";
import {
  ingredientFilterGroups as buildIngredientFilterGroups,
  ingredientSelectedIds,
  ingredientTagCounts,
  ingredientTagMatcher,
  normalizeIngredientSelection,
} from "./tag-filter";
import type { IngredientTagCounts, IngredientTagSelection } from "./tag-filter";
import type { IngredientTagGroupKey } from "./tag-filter-policy";

export function ingredientFilterGroups(
  data: IngredientsData,
  counts: IngredientTagCounts,
): FilterGroup<IngredientTagGroupKey>[] {
  return buildIngredientFilterGroups(data.tagSource, counts);
}

export function ingredientSelection(data: IngredientsData, query: IngredientsQuery) {
  return normalizeIngredientSelection(data.tagSource, {
    ingredientCategories: query.ingredientCategories,
    ingredientColors: query.ingredientColors,
    ingredientQualities: query.ingredientQualities,
  });
}

export function queryIngredients(data: IngredientsData, query: IngredientsQuery) {
  const matchesName = createNameMatcher(query.q);
  const selection: IngredientTagSelection = ingredientSelection(data, query);
  const active = Boolean(query.q.trim() || ingredientSelectedIds(selection).length);
  const searched = [...data.itemsById.values()].filter((item) => matchesName(item.name));
  const counts = ingredientTagCounts(data.tagSource, searched);
  const matchesTags = ingredientTagMatcher(data.tagSource, selection);
  const items = searched.filter((item) => matchesTags(item.id));
  sortRecords(items, query.sort, (item) => data.dishesByItemId.get(item.id)?.length ?? 0);
  return { items, active, counts };
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
