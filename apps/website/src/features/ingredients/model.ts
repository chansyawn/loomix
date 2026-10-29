import type { IngredientCategory, IngredientExpression } from "@loomix/schema/catalog";
import type { CollectionView, DishItem, IngredientItem } from "../collection-view";
import type { IngredientFilterKey } from "./search";

export type IngredientDimension = "type" | "color" | "quality" | "group";
export type IngredientTag = {
  category: IngredientCategory;
  filterKey: IngredientFilterKey;
};
export type IngredientCondition = {
  position: number;
  expression: IngredientExpression;
  label: string;
};
export type IngredientDishMatch = { dish: DishItem; conditions: IngredientCondition[] };
export type IngredientUsage = {
  tags: IngredientTag[];
  dishes: IngredientDishMatch[];
};
export type IngredientsData = {
  categories: IngredientCategory[];
  categoriesById: ReadonlyMap<number, IngredientCategory>;
  dimensions: ReadonlyMap<number, IngredientDimension>;
  itemsById: ReadonlyMap<number, IngredientItem>;
  categoriesByItemId: ReadonlyMap<number, IngredientCategory[]>;
  dishesByItemId: ReadonlyMap<number, IngredientDishMatch[]>;
  unconfirmedRecipeCount: number;
};

function dimension(
  category: IngredientCategory,
  categories: ReadonlyMap<number, IngredientCategory>,
): IngredientDimension {
  const seen = new Set<number>();
  let current: IngredientCategory | undefined = category;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.tagName === "食材_颜色") return "color";
    if (current.tagName === "食材_品阶") return "quality";
    current = current.parentId === null ? undefined : categories.get(current.parentId);
  }
  return ["食材", "食材_荤菜", "食材_素菜", "食材_原料", "食材_不宜使用"].includes(category.tagName)
    ? "group"
    : "type";
}

export function ingredientFilterKey(
  category: IngredientCategory,
  categories: ReadonlyMap<number, IngredientCategory>,
): IngredientFilterKey {
  const value = dimension(category, categories);
  if (value === "color") return "colors";
  if (value === "quality") return "qualities";
  return "types";
}

export function ingredientTag(
  category: IngredientCategory,
  categories: ReadonlyMap<number, IngredientCategory>,
): IngredientTag {
  return { category, filterKey: ingredientFilterKey(category, categories) };
}

type MatchIndex = Map<number, Map<number, IngredientDishMatch>>;

function addMatch(
  index: MatchIndex,
  id: number,
  dish: DishItem,
  condition: IngredientCondition,
): void {
  let matches = index.get(id);
  if (!matches) {
    matches = new Map();
    index.set(id, matches);
  }
  const previous = matches.get(dish.id);
  if (previous) previous.conditions.push(condition);
  else matches.set(dish.id, { dish, conditions: [condition] });
}

function flattenIndex(index: MatchIndex): Map<number, IngredientDishMatch[]> {
  return new Map([...index].map(([id, matches]) => [id, [...matches.values()]]));
}

export function buildIngredientsData(
  view: Pick<CollectionView, "ingredientCategories" | "ingredientItemsById" | "dishes">,
): IngredientsData {
  const categories = view.ingredientCategories;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const dimensions = new Map(
    categories.map((category) => [category.id, dimension(category, categoriesById)]),
  );
  const itemsById = new Map<number, IngredientItem>();
  const categoriesByItemId = new Map<number, IngredientCategory[]>();
  for (const category of categories) {
    for (const id of new Set(category.itemIds)) {
      const item = view.ingredientItemsById.get(id);
      // Reference-only records have no canonical detail page and must not become browsable.
      if (!item || item.listed === false) continue;
      itemsById.set(id, item);
      categoriesByItemId.set(id, [...(categoriesByItemId.get(id) ?? []), category]);
    }
  }
  const byItem: MatchIndex = new Map();
  let unconfirmedRecipeCount = 0;
  for (const dish of view.dishes.items) {
    const slots = dish.recipe?.slots;
    if (!slots || slots.some((slot) => slot.expression === null || slot.itemIds === null))
      unconfirmedRecipeCount++;
    slots?.forEach((slot, index) => {
      if (slot.expression === null || slot.itemIds === null) return;
      const condition = {
        position: index + 1,
        expression: slot.expression,
        label: ingredientConditionLabel(slot.expression, categoriesById),
      };
      // The resolved candidates preserve intersections (all) and unions (any).
      for (const id of new Set(slot.itemIds)) {
        if (!itemsById.has(id)) continue;
        addMatch(byItem, id, dish, condition);
      }
    });
  }
  return {
    categories,
    categoriesById,
    dimensions,
    itemsById,
    categoriesByItemId,
    dishesByItemId: flattenIndex(byItem),
    unconfirmedRecipeCount,
  };
}

export function ingredientUsage(data: IngredientsData, itemId: number): IngredientUsage | null {
  const categories = (data.categoriesByItemId.get(itemId) ?? []).filter(
    (category) => !["食材", "食材_颜色", "食材_品阶", "食材_不宜使用"].includes(category.tagName),
  );
  return categories.length
    ? {
        tags: categories.map((category) => ingredientTag(category, data.categoriesById)),
        dishes: data.dishesByItemId.get(itemId) ?? [],
      }
    : null;
}

export function ingredientConditionLabel(
  expression: IngredientExpression,
  categories: ReadonlyMap<number, IngredientCategory>,
): string {
  if (expression.kind === "category")
    return categories.get(expression.categoryId)?.name ?? "未收录类别";
  const labels = expression.terms.map((term) => {
    const label = ingredientConditionLabel(term, categories);
    return term.kind !== "category" && term.kind !== expression.kind ? `（${label}）` : label;
  });
  return labels.join(expression.kind === "all" ? " 且 " : " 或 ");
}
