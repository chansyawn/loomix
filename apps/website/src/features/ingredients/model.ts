import type { IngredientExpression } from "@loomix/schema/catalog";
import type { CollectionView, DishItem, IngredientItem } from "../collection-view";
import { ingredientLeafTags as leafTagsOf, ingredientUsageTags } from "./tag-filter";
import type { IngredientTag, IngredientTagSource } from "./tag-source";

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
  tagSource: IngredientTagSource;
  itemsById: ReadonlyMap<number, IngredientItem>;
  ingredientCandidatesByDishId: ReadonlyMap<number, number[]>;
  dishesByItemId: ReadonlyMap<number, IngredientDishMatch[]>;
};

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
  view: Pick<CollectionView, "ingredientTagSource" | "ingredientItemsById" | "dishes">,
): IngredientsData {
  const tagSource = view.ingredientTagSource;
  const itemsById = new Map<number, IngredientItem>();
  for (const id of tagSource.itemIds) {
    const item = view.ingredientItemsById.get(id);
    // 仅供引用的记录没有正式详情页，不得作为可浏览条目展示。
    if (!item || item.listed === false) continue;
    itemsById.set(id, item);
  }
  const byItem: MatchIndex = new Map();
  const ingredientCandidatesByDishId = new Map<number, Set<number>>();
  for (const dish of view.dishes.items) {
    dish.slots.forEach((slot, index) => {
      const condition = {
        position: index + 1,
        expression: slot.expression,
        label: ingredientConditionLabel(slot.expression, tagSource.byId),
      };
      // 解析后的候选项保留交集（all）与并集（any）语义。
      for (const id of new Set(slot.itemIds)) {
        if (!itemsById.has(id)) continue;
        addMatch(byItem, id, dish, condition);
        const candidates = ingredientCandidatesByDishId.get(dish.id) ?? new Set<number>();
        candidates.add(id);
        ingredientCandidatesByDishId.set(dish.id, candidates);
      }
    });
  }
  return {
    tagSource,
    itemsById,
    ingredientCandidatesByDishId: new Map(
      [...ingredientCandidatesByDishId].map(([id, candidates]) => [id, [...candidates]]),
    ),
    dishesByItemId: flattenIndex(byItem),
  };
}

export function ingredientUsage(data: IngredientsData, itemId: number): IngredientUsage | null {
  if (!data.itemsById.has(itemId)) return null;
  const tags = ingredientUsageTags(data.tagSource, itemId);
  return tags.length
    ? {
        tags,
        dishes: data.dishesByItemId.get(itemId) ?? [],
      }
    : null;
}

export function ingredientLeafTags(data: IngredientsData, itemId: number): IngredientTag[] {
  return leafTagsOf(data.tagSource, itemId);
}

export function ingredientConditionLabel(
  expression: IngredientExpression,
  tags: ReadonlyMap<number, { name: string }>,
): string {
  if (expression.kind === "tag") return tags.get(expression.tagId)?.name ?? "未收录类别";
  const labels = expression.terms.map((term) => {
    const label = ingredientConditionLabel(term, tags);
    return term.kind !== "tag" && term.kind !== expression.kind ? `（${label}）` : label;
  });
  return labels.join(expression.kind === "all" ? " 且 " : " 或 ");
}
