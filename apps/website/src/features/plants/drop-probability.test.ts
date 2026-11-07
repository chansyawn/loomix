import { expect, test } from "vite-plus/test";
import { dropProbability } from "./drop-probability";

test.each([
  [null, "未知"],
  [0, "0%"],
  [1, "100%"],
  [0.63, "63%"],
  [0.025, "2.5%"],
  [25 / 957, "2.61%"],
  [25 / 953, "2.62%"],
  [25 / 925, "2.7%"],
  [0.0001, "0.01%"],
  [0.000001, "<0.01%"],
])("格式化掉落概率 %s 为 %s", (value, expected) => {
  expect(dropProbability(value)).toBe(expected);
});
