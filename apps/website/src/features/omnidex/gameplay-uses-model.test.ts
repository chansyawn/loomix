import { expect, test } from "vite-plus/test";
import { material, vignette } from "../../../../../packages/schema/tests/fixture";
import { categoryExpression, recipeFixture, recipeSlot } from "../ingredients/fixture";
import { catalogFixture, imageIndexFixture } from "../omnidex-fixture";
import { createOmnidexCatalog } from "./catalog";
import { catalogEntryLocation } from "./entry-location";
import {
  activeGameplayUseCategory,
  catalogGameplayUses,
  vignetteGameplayUses,
  visibleGameplayUseCategories,
  type GameplayUse,
} from "./gameplay-uses-model";

const use: GameplayUse = {
  id: 1,
  name: "示例",
  image: null,
  destination: catalogEntryLocation({ id: 1 }),
  conditions: [{ hash: "slot-1", summary: "可用作第 1 个食材", linkLabel: "查看食材 1" }],
};

test("烹饪用途标明候选食材位，并保留食材条件和对应锚点", () => {
  const { catalog, gameplayTags } = catalogFixture({
    miscellaneous: [{ id: 2, name: "虾", image: null, description: null, quality: null }],
    ingredientCategories: [
      { id: 10, name: "食材", tagName: "食材", parentId: null, itemIds: [] },
      { id: 11, name: "荤菜", tagName: "食材_荤菜", parentId: 10, itemIds: [] },
      { id: 12, name: "虾类", tagName: "食材_荤菜_虾类", parentId: 11, itemIds: [2] },
    ],
    dishes: {
      items: [recipeFixture(900, [recipeSlot(categoryExpression(12), [2])])],
      series: [],
    },
  });
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);

  expect(catalogGameplayUses(data, 2).cooking[0]?.conditions).toEqual([
    { hash: "slot-1", summary: "可用作第 1 个食材", linkLabel: "查看食材 1 · 虾类" },
  ]);
});

test("小栖地用途区分指定摆放物和候选承载物，并保留各自锚点", () => {
  const item = { ...material(2), tagIds: [10] };
  const template = vignette();
  template.requirements[0]!.support = { allTagIds: [10] };
  const { catalog, gameplayTags } = catalogFixture();
  catalog.items.push(item);
  gameplayTags.tags.push({ id: 10, internalName: "矮桌", displayName: null, parentId: null });
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);

  const [use] = vignetteGameplayUses(data, item, { templates: [template], fallbackItems: [] });
  expect(use?.conditions).toEqual([
    {
      hash: "requirement-1",
      summary: "指定摆放物 ×6",
      linkLabel: "查看第 1 条布景要求 · 任意花株",
    },
    {
      hash: "vignette-support-1",
      summary: "可作为承载物",
      linkLabel: "查看第 1 条布景要求的承载物 · 任意花株 · 矮桌",
    },
  ]);
});

test("仅返回当前物品有命中的用途分类", () => {
  expect(visibleGameplayUseCategories({ crafting: [], cooking: [], vignette: [] })).toEqual([]);
  expect(visibleGameplayUseCategories({ crafting: [], cooking: [], vignette: [use] })).toEqual([
    "vignette",
  ]);
  expect(visibleGameplayUseCategories({ crafting: [use], cooking: [], vignette: [use] })).toEqual([
    "crafting",
    "vignette",
  ]);
});

test("初次选第一项，回退或异步新增分类时保留可见的已选项", () => {
  expect(activeGameplayUseCategory([], "cooking")).toBeUndefined();
  expect(activeGameplayUseCategory(["crafting", "cooking"], undefined)).toBe("crafting");
  expect(activeGameplayUseCategory(["crafting", "cooking", "vignette"], "cooking")).toBe("cooking");
  expect(activeGameplayUseCategory(["cooking", "vignette"], "crafting")).toBe("cooking");
});
