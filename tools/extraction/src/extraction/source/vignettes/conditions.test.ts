import { expect, test } from "vite-plus/test";
import { readPlacementRules, readRequirements, targetReader } from "./conditions.ts";

const tagIds = new Map([
  ["座椅", 30008],
  ["置物桌", 30016],
  ["花株", 668592871],
  ["白色", 20024],
]);
const target = targetReader((name) => tagIds.get(name));

test("保留承载、标签交集、面积和组合摆法", () => {
  expect(
    readRequirements(
      1,
      "2,置物桌,白色&花株,4,2*2;",
      "2,置物桌,白色&花株,4,2*2:120090,1,120091,2;",
      { zh: "组合", en: "Combination" },
      target,
      30008,
    ),
  ).toEqual([
    {
      support: { allTagIds: [30016] },
      target: { allTagIds: [20024, 668592871] },
      quantity: { configured: 4, displayed: 4 },
      area: { width: 2, height: 2 },
      label: { zh: "组合", en: "Combination" },
      examples: [
        { itemId: 120090, quantity: 1 },
        { itemId: 120091, quantity: 2 },
      ],
    },
  ]);
});

test("只允许已登记的露营地座椅差异", () => {
  const labels = { zh: "座椅", en: "Seat" };
  expect(
    readRequirements(1007, "1,座椅,3", "1,座椅,2:1862,2", labels, target, 30008)[0].quantity,
  ).toEqual({ configured: 3, displayed: 2 });
  expect(() => readRequirements(1008, "1,座椅,3", "1,座椅,2", labels, target, 30008)).toThrow(
    "quantity",
  );
  expect(() => readRequirements(1007, "1,座椅,3", "1,置物桌,2", labels, target, 30008)).toThrow(
    "shape",
  );
  expect(() => readRequirements(1007, "1,座椅,3", "1,座椅,2:1862", labels, target, 30008)).toThrow(
    "examples",
  );
  expect(() => target("未知标签")).toThrow("Unknown vignette tag");
});

test("按显示次序保留规则，并保留重复相邻对象", () => {
  expect(readPlacementRules([1, 3], "1,花株,花株", target, () => null)).toEqual([
    { kind: "range", ruleId: 1, text: null },
    {
      kind: "adjacent",
      ruleId: 3,
      targets: [{ allTagIds: [668592871] }, { allTagIds: [668592871] }],
      text: null,
    },
  ]);
  expect(readPlacementRules([1, 9, 5], "2,花株,水域", target, () => null).at(-1)).toMatchObject({
    kind: "near-water",
  });
  expect(() => readPlacementRules([1, 9, 5], "2,花株,草地", target, () => null)).toThrow(
    "near-water",
  );
  expect(() => readPlacementRules([1, 9, 5], null, target, () => null)).toThrow("coverage");
  expect(() => readPlacementRules([1, 11], null, target, () => null)).toThrow(
    "Unknown vignette placement rule",
  );
});
