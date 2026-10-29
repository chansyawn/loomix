import type { IngredientItem } from "../collection-view";
import type { FilterGroup } from "../collection/filter-panel";
import type { IngredientsData } from "./model";
import type { IngredientsQuery } from "./search";
import {
  ingredientTagCounts,
  ingredientTagFilterGroup,
  ingredientTagMatcher,
  normalizeIngredientTagIds,
} from "./tag-filter";
import type { IngredientTagCounts } from "./tag-filter";

export function ingredientFilterGroups(
  data: IngredientsData,
  counts: IngredientTagCounts,
): FilterGroup<"ingredientTags">[] {
  return [ingredientTagFilterGroup(data, counts)];
}

export function queryIngredients(data: IngredientsData, query: IngredientsQuery) {
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const tags = normalizeIngredientTagIds(data, query.ingredientTags);
  const active = Boolean(term || tags.length);
  const searched = [...data.itemsById.values()].filter(
    (item) => !term || item.name.toLocaleLowerCase("zh-CN").includes(term),
  );
  const counts = ingredientTagCounts(data, searched);
  const matchesTags = ingredientTagMatcher(data, tags);
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
