import type { IngredientCategory } from "@loomix/schema/catalog";
import type { DishItem } from "../collection-view";
import type { FilterGroup, FilterOption } from "../collection/filter-panel";
import type { IngredientsData } from "./model";

export type IngredientTagDimension = "category" | "color" | "quality";
export type IngredientTagCounts = ReadonlyMap<number, number>;

const categoryDimensionNames = {
  category: "分类",
  color: "颜色",
  quality: "品质",
} as const;
const structuralTagNames = new Set(["食材", "食材_颜色", "食材_品阶"]);

function tagDimension(data: IngredientsData, categoryId: number): IngredientTagDimension | null {
  const dimension = data.dimensions.get(categoryId);
  if (dimension === "color") return "color";
  if (dimension === "quality") return "quality";
  if (dimension === "type" || dimension === "group") return "category";
  return null;
}

export function normalizeIngredientTagIds(data: IngredientsData, values: string[]): string[] {
  const selected = new Set(values.map(Number).filter((id) => data.categoriesById.has(id)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of data.categories) {
      if (!selected.has(category.id)) continue;
      for (const child of data.childrenByCategoryId.get(category.id) ?? []) {
        if (selected.has(child.id)) continue;
        selected.add(child.id);
        changed = true;
      }
    }
    for (const category of [...data.categories].reverse()) {
      const children = data.childrenByCategoryId.get(category.id) ?? [];
      if (
        selected.has(category.id) ||
        children.length === 0 ||
        !children.every((child) => selected.has(child.id))
      )
        continue;
      selected.add(category.id);
      changed = true;
    }
  }
  return data.categories
    .filter((category) => selected.has(category.id) && !structuralTagNames.has(category.tagName))
    .map((category) => String(category.id));
}

export function ingredientTagMatcher(
  data: IngredientsData,
  selectedIds: string[],
): (itemId: number) => boolean {
  const selectedByDimension = new Map<IngredientTagDimension, Set<number>>();
  for (const value of selectedIds) {
    const categoryId = Number(value);
    const dimension = tagDimension(data, categoryId);
    if (!dimension) continue;
    const selected = selectedByDimension.get(dimension) ?? new Set<number>();
    selected.add(categoryId);
    selectedByDimension.set(dimension, selected);
  }
  const dimensions = [...selectedByDimension.values()];
  return (itemId) => {
    if (dimensions.length === 0) return true;
    const categoryIds = new Set(
      (data.categoriesByItemId.get(itemId) ?? []).map((category) => category.id),
    );
    return dimensions.every((selected) =>
      [...selected].some((categoryId) => categoryIds.has(categoryId)),
    );
  };
}

export function ingredientTagMatches(
  data: IngredientsData,
  selectedIds: string[],
  itemId: number,
): boolean {
  return ingredientTagMatcher(data, selectedIds)(itemId);
}

export function ingredientTagCounts(
  data: IngredientsData,
  items: Iterable<{ id: number }>,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of items)
    for (const category of data.categoriesByItemId.get(item.id) ?? [])
      counts.set(category.id, (counts.get(category.id) ?? 0) + 1);
  return counts;
}

export function dishIngredientTagCounts(
  data: IngredientsData,
  dishes: Iterable<DishItem>,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const dish of dishes) {
    const matchedCategories = new Set<number>();
    for (const itemId of data.ingredientCandidatesByDishId.get(dish.id) ?? [])
      for (const category of data.categoriesByItemId.get(itemId) ?? [])
        matchedCategories.add(category.id);
    for (const categoryId of matchedCategories)
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return counts;
}

function categoryOption(
  data: IngredientsData,
  category: IngredientCategory,
  counts: IngredientTagCounts,
  section: IngredientTagDimension,
  path: string[],
): FilterOption {
  const children = data.childrenByCategoryId.get(category.id) ?? [];
  const count = counts.get(category.id) ?? 0;
  const dimensionRoot = structuralTagNames.has(category.tagName);
  const childPath = dimensionRoot ? [] : [...path, category.name];
  return {
    value: String(category.id),
    label: category.name,
    chipLabel: dimensionRoot
      ? categoryDimensionNames[section]
      : `${categoryDimensionNames[section]} · ${[...path, category.name].join(" / ")}`,
    count,
    disabled: count === 0,
    children: children.map((child) => categoryOption(data, child, counts, section, childPath)),
  };
}

function sectionOption(value: string, label: string, children: FilterOption[]): FilterOption {
  return {
    value,
    label,
    selectable: false,
    defaultExpanded: true,
    children,
  };
}

export function ingredientTagFilterGroup(
  data: IngredientsData,
  counts: IngredientTagCounts,
): FilterGroup<"ingredientTags"> {
  const root = data.categories.find((category) => category.tagName === "食材");
  const colorRoot = data.categories.find((category) => category.tagName === "食材_颜色");
  const qualityRoot = data.categories.find((category) => category.tagName === "食材_品阶");
  const classification = (root ? (data.childrenByCategoryId.get(root.id) ?? []) : []).filter(
    (category) => tagDimension(data, category.id) === "category",
  );
  return {
    key: "ingredientTags",
    label: "食材标签",
    description: "父级包含子级；同一维度内任选，不同维度需由同一种食材同时满足。",
    tree: true,
    options: [
      sectionOption(
        "__category",
        "分类",
        classification.map((category) => categoryOption(data, category, counts, "category", [])),
      ),
      ...(colorRoot
        ? [
            sectionOption(
              "__color",
              "颜色",
              (data.childrenByCategoryId.get(colorRoot.id) ?? []).map((category) =>
                categoryOption(data, category, counts, "color", []),
              ),
            ),
          ]
        : []),
      ...(qualityRoot
        ? [
            sectionOption(
              "__quality",
              "食材品质",
              (data.childrenByCategoryId.get(qualityRoot.id) ?? []).map((category) =>
                categoryOption(data, category, counts, "quality", []),
              ),
            ),
          ]
        : []),
    ],
  };
}
