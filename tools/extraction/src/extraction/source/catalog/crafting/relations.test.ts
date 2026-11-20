import { expect, test } from "vite-plus/test";
import { createFixture } from "../../neighbors/fixtures/tables.ts";
import { readCraftingRecipes } from "./read.ts";

test("配方按产物收录，材料槽位保留数量", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [
      [111610, { text: "创想卡：小轩窗" }, 19],
      [111758, { text: "创想卡：青竹地板" }, 19],
      [1610],
      [1758],
      [30104],
    ],
    180: [
      [5, { text: "听丰年创想卡集" }],
      [999, { text: "其他创想卡" }],
      [1, { text: "开物创想卡集" }],
    ],
    568: [
      [111610, 1610, 1, 5, null, null, null, null, null, null, null, null, 30104, 4],
      [111758, 1758, 1, 999],
    ],
  });
  onTestFinished(fixture.cleanup);
  const { tables } = fixture.input;
  const recipes = readCraftingRecipes({ tables }, new Set([1610, 1758])).recipes;
  expect(recipes).toMatchObject([
    { id: 111610, productId: 1610, cardSetId: 5, materials: [{ itemId: 30104, quantity: 4 }] },
    { id: 111758, productId: 1758, cardSetId: 999, materials: null },
  ]);
});

test("无效卡集外键报错，不转换为缺省", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [[100, null, 19], [200]],
    180: [],
    568: [[100, 200, 1, 999]],
  });
  onTestFinished(fixture.cleanup);
  expect(() => readCraftingRecipes(fixture.input, new Set([200]))).toThrow(
    "Unknown crafting collection",
  );
});
