import { expect, test } from "vite-plus/test";
import { catalogEntryLocation } from "./entry-location";
import {
  activeGameplayUseCategory,
  visibleGameplayUseCategories,
  type GameplayUse,
} from "./gameplay-uses-model";

const use: GameplayUse = {
  id: 1,
  name: "示例",
  image: null,
  destination: catalogEntryLocation({ id: 1 }),
  conditions: [{ hash: "slot-1", label: "食材 1", reason: "候选食材" }],
};

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
