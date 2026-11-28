import { expect, test } from "vite-plus/test";
import { datasetFixture, dish, material } from "../../../../packages/schema/tests/fixture.ts";
import type { ItemOf } from "@loomix/schema/catalog";
import { createFixture } from "../extraction/source/neighbors/fixtures/tables.ts";
import { verifyCookingItems } from "./cooking.ts";

test("源表逐对校验菜谱产物，并区分同号异类、分享装和范围外产物", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [
      [11, { text: "秘方:甲" }, 300],
      [12, { text: "菜谱:乙" }, 300],
      [13, { text: "分享装" }, 300],
      [14, { text: "菜谱:未收录" }, 300],
      [21, { text: "同号成品" }, 204],
    ],
    122: [
      [11, null, null, null, 21],
      [12, null, null, null, 22],
      [14, null, null, null, 23],
      [21, null, null, null, 24],
    ],
  });
  onTestFinished(fixture.cleanup);
  const { tables } = fixture.input;
  const { catalog } = datasetFixture();
  const card = (id: number, productId: number): ItemOf<"cookingRecipeItem"> => ({
    ...material(id),
    kind: "cookingRecipeItem",
    name: tables.text(tables.byId(318).get(id), 1)!,
    productId,
    front: { background: { assetId: "bg", variant: "card-background" } },
  });
  const first = card(11, 21),
    second = card(12, 22);
  catalog.items = [first, second, dish(21), dish(22), dish(24)];
  const exclusions = [
    { id: 13, productId: null, reason: "no_recipe", sources: [] },
    { id: 14, productId: 23, reason: "outside_dishes", sources: [] },
  ];
  const verify = () => [...verifyCookingItems(catalog, tables, exclusions)];
  expect(verify()).toEqual([11, 12]);
  exclusions[1].reason = "no_recipe";
  expect(verify).toThrow(/exclusions/);
  exclusions[1].reason = "outside_dishes";
  first.productId = 22;
  second.productId = 21;
  expect(verify).toThrow(/products/);
});
