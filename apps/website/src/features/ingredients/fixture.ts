import type { IngredientCategory, IngredientExpression } from "@loomix/schema/catalog";
import type { DishItem, IngredientItem } from "../collection-view";
import { buildIngredientsData } from "./model";

export const categoryExpression = (categoryId: number): IngredientExpression => ({
  kind: "category",
  categoryId,
});

export function ingredientFixture(id: number, name: string, listed = true): IngredientItem {
  return {
    id,
    name,
    image: null,
    description: null,
    quality: null,
    catalogCategory: "plants",
    listed,
  };
}

export function recipeFixture(id: number, recipe: DishItem["recipe"]): DishItem {
  return {
    id,
    name: `菜肴${id}`,
    image: null,
    description: null,
    quality: null,
    difficulty: null,
    galaxyFlavor: null,
    cookware: null,
    effectsText: null,
    effects: null,
    tastes: null,
    difficultyRequirement: null,
    acquisition: null,
    recipe,
  };
}

export function recipeSlot(expression: IngredientExpression | null, itemIds: number[] | null) {
  return { field: 20 as const, rawExpression: "fixture", expression, itemIds, quantity: null };
}

function category(
  id: number,
  name: string,
  tagName: string,
  parentId: number | null,
  itemIds: number[],
): IngredientCategory {
  return { id, name, tagName, parentId, itemIds };
}

export function ingredientsFixture() {
  const categories = [
    category(1, "食材", "食材", null, [1, 2, 3, 4, 5, 6, 9]),
    category(2, "素食", "食材_素菜", 1, [1, 2, 3, 4]),
    category(3, "荤菜", "食材_荤菜", 1, [5, 6]),
    category(10, "蔬菜类", "食材_蔬菜", 2, [1, 2, 3]),
    category(11, "番茄", "食材_番茄", 10, [1, 2, 3]),
    category(12, "水果类", "食材_水果", 2, [4]),
    category(13, "虾类", "食材_虾", 3, [5, 6]),
    category(14, "未收录类别", "食材_空", 2, []),
    category(15, "引用类别", "食材_引用", 2, [9, 999]),
    category(20, "颜色", "食材_颜色", 1, [1, 2, 3, 4]),
    category(21, "红色蔬菜", "食材_红色蔬菜", 20, [1, 2, 3]),
    category(30, "食材品质", "食材_品阶", 1, [2, 6]),
    category(31, "特优", "食材_紫色", 30, [2, 6]),
  ];
  const items = [
    ingredientFixture(1, "番茄"),
    ingredientFixture(2, "奇异番茄"),
    ingredientFixture(3, "丰硕番茄"),
    ingredientFixture(4, "苹果"),
    ingredientFixture(5, "普通虾"),
    ingredientFixture(6, "特优虾"),
    ingredientFixture(8, "非食材物品"),
    ingredientFixture(9, "未收录引用", false),
  ];
  const dishes = [
    recipeFixture(100, {
      slots: [
        recipeSlot(categoryExpression(11), [1, 1, 2, 3]),
        { ...recipeSlot(categoryExpression(11), [1, 2, 3]), field: 25 },
      ],
    }),
    recipeFixture(101, {
      slots: [
        recipeSlot({ kind: "all", terms: [categoryExpression(13), categoryExpression(31)] }, [6]),
      ],
    }),
    recipeFixture(102, {
      slots: [
        recipeSlot(
          { kind: "any", terms: [categoryExpression(11), categoryExpression(12)] },
          [1, 2, 3, 4],
        ),
      ],
    }),
    recipeFixture(103, {
      slots: [
        recipeSlot({ kind: "all", terms: [categoryExpression(12), categoryExpression(31)] }, []),
      ],
    }),
    recipeFixture(104, null),
    recipeFixture(105, { slots: null }),
    recipeFixture(106, { slots: [recipeSlot(null, [1])] }),
    recipeFixture(107, { slots: [] }),
    recipeFixture(108, { slots: [recipeSlot(categoryExpression(11), null)] }),
    recipeFixture(109, {
      slots: [recipeSlot(categoryExpression(11), [1]), { ...recipeSlot(null, null), field: 25 }],
    }),
  ];
  const input = {
    ingredientCategories: categories,
    ingredientItemsById: new Map(items.map((item) => [item.id, item])),
    dishes: { items: dishes, series: [] },
  };
  return { input, data: buildIngredientsData(input) };
}
