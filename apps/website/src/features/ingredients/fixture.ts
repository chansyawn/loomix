import type { IngredientExpression } from "@loomix/schema/catalog";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import type { GameplayTag } from "@loomix/schema/gameplay-tags";
import type { DishItem, IngredientItem } from "../omnidex-view";
import { buildIngredientsData } from "./model";
import { createIngredientTagSource } from "./tag-source";
import type { IngredientTagSource } from "./tag-source";

export const categoryExpression = (categoryId: number): IngredientExpression => ({
  kind: "tag",
  tagId: categoryId,
});

export function ingredientFixture(id: number, name: string, browsable = true): IngredientItem {
  return {
    id,
    name,
    image: null,
    description: null,
    quality: null,
    catalogCategory: "plants",
    browsable,
  };
}

export function recipeFixture(id: number, slots: DishItem["slots"]): DishItem {
  return {
    id,
    name: `菜肴${id}`,
    image: null,
    description: null,
    quality: null,
    difficulty: null,
    galaxyFlavor: null,
    cookware: null,
    strength: null,
    effects: null,
    tastes: null,
    unlockCondition: null,
    slots,
  };
}

export function recipeSlot(expression: IngredientExpression, itemIds: number[]) {
  return { expression, itemIds };
}

function tag(
  id: number,
  internalName: string,
  displayName: string | null,
  parentId: number | null,
): GameplayTag {
  return { id, internalName, displayName, parentId };
}

export const ingredientFixtureTags: GameplayTag[] = [
  tag(1, "食材", "食材", null),
  tag(2, "食材_素菜", "素食", 1),
  tag(3, "食材_荤菜", "荤菜", 1),
  tag(5, "食材_原料", "原料", 1),
  tag(10, "食材_蔬菜", "蔬菜类", 2),
  tag(11, "食材_番茄", "番茄", 10),
  tag(12, "食材_水果", "水果类", 2),
  tag(13, "食材_虾", "虾类", 3),
  tag(20, "食材_颜色", null, 1),
  tag(21, "食材_红色蔬菜", "红色蔬菜", 20),
  tag(30, "食材_品阶", "食材品质", 1),
  tag(31, "食材_紫色", "特优", 30),
  tag(40, "食材_不宜使用", "不宜食用", 1),
];

export const ingredientFixtureItemTags: { id: number; tagIds: number[] }[] = [
  { id: 1, tagIds: [11, 21] },
  { id: 2, tagIds: [11, 21, 31] },
  { id: 3, tagIds: [11, 21] },
  { id: 4, tagIds: [12] },
  { id: 5, tagIds: [13] },
  { id: 6, tagIds: [13, 31] },
  { id: 8, tagIds: [] },
  { id: 9, tagIds: [11] },
];

export function ingredientTagSourceFixture(
  itemTags: readonly { id: number; tagIds: number[] }[] = ingredientFixtureItemTags,
): IngredientTagSource {
  return createIngredientTagSource(createGameplayTagIndex(ingredientFixtureTags), itemTags);
}

export function ingredientsFixture() {
  const tagSource = ingredientTagSourceFixture();
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
    recipeFixture(100, [
      recipeSlot(categoryExpression(11), [1, 1, 2, 3]),
      recipeSlot(categoryExpression(11), [1, 2, 3]),
    ]),
    recipeFixture(101, [
      recipeSlot({ kind: "all", terms: [categoryExpression(13), categoryExpression(31)] }, [6]),
    ]),
    recipeFixture(102, [
      recipeSlot(
        { kind: "any", terms: [categoryExpression(11), categoryExpression(12)] },
        [1, 2, 3, 4],
      ),
    ]),
    recipeFixture(103, [
      recipeSlot({ kind: "all", terms: [categoryExpression(12), categoryExpression(31)] }, []),
    ]),
    recipeFixture(104, []),
  ];
  const input = {
    ingredientTagSource: tagSource,
    ingredientItemsById: new Map(items.map((item) => [item.id, item])),
    dishes: { items: dishes, series: [] },
  };
  return { input, data: buildIngredientsData(input) };
}
