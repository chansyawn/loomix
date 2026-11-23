import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { expect, test } from "vite-plus/test";
import { material, reference, vignette } from "../../../../../packages/schema/tests/fixture";
import { createRequirementMatcher, findVignetteUses } from "./requirement-matching";

const tagIndex = createGameplayTagIndex([
  { id: 10, internalName: "食物", displayName: null, parentId: null },
  { id: 20, internalName: "甜食", displayName: null, parentId: 10 },
  { id: 30, internalName: "红色", displayName: null, parentId: null },
]);

test("标签条件要求全部标签并包含祖先，指定物品按 ID 匹配", () => {
  const matches = createRequirementMatcher(tagIndex);
  const item = { ...material(2), tagIds: [20, 30] };
  expect(matches(item, { allTagIds: [10, 30] })).toBe(true);
  expect(matches({ ...item, tagIds: [10] }, { allTagIds: [20] })).toBe(false);
  expect(matches({ ...item, tagIds: [20] }, { allTagIds: [10, 30] })).toBe(false);
  expect(matches(item, { itemId: 2 })).toBe(true);
  expect(matches(item, { itemId: 3 })).toBe(false);
  expect(matches(reference(2), { allTagIds: [10] })).toBe(false);
});

test("反查按模板汇总摆放物和承载物，忽略参考物品和摆放规则", () => {
  const template = vignette();
  const requirement = template.requirements[0]!;
  requirement.support = { allTagIds: [10] };
  template.requirements.push({ ...requirement, target: { itemId: 3 }, support: { itemId: 2 } });
  const other = vignette(1003);
  other.requirements[0] = {
    ...requirement,
    target: { itemId: 3 },
    support: null,
    examples: [{ itemId: 2, quantity: 1 }],
  };
  other.placementRules.push({ kind: "near-water", ruleId: 2, target: { itemId: 2 }, text: null });
  const [match, ...others] = findVignetteUses(
    [template, other],
    { ...material(2), tagIds: [20] },
    tagIndex,
  );
  expect(match?.template.id).toBe(template.id);
  expect(match?.conditions.map(({ position, role }) => [position, role])).toEqual([
    [1, "摆放物"],
    [1, "承载物"],
    [2, "承载物"],
  ]);
  expect(others).toEqual([]);
  expect(findVignetteUses([template], reference(2), tagIndex)).toEqual([]);
});
