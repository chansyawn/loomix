import { expect, test } from "vite-plus/test";
import { TAG_LABEL_OVERRIDES } from "../../../../src/features/collection/tags.ts";
import { labelFixture } from "../fixture.ts";
import { checkTagLabels } from "./labels.ts";

test("当前命名特例都能找到目标", () => {
  const result = checkTagLabels(labelFixture());
  expect(result.issues).toEqual([]);
  expect(result.summary).toBe(`${Object.keys(TAG_LABEL_OVERRIDES).length} 个命名特例`);
});

test("报告缺失的命名特例目标", () => {
  const missing = Object.keys(TAG_LABEL_OVERRIDES)[0];
  const result = checkTagLabels(labelFixture().slice(1));
  expect(result.issues).toContainEqual({
    path: "gameplay-tags",
    message: `命名特例指向不存在的标签：${missing}`,
  });
});
