import { expect, test } from "vite-plus/test";
import { createFixture, type FixtureRows } from "../neighbors/fixtures/tables.ts";
import { readCraftingCards } from "./read.ts";

function rows(): FixtureRows {
  const recipe = (id: number) => [
    id,
    200,
    1,
    44,
    null,
    null,
    null,
    "CardBag.png",
    "CardBack.png",
    "CardBg.png",
    null,
    null,
    300,
    5,
  ];
  return {
    318: [
      [100, { text: "创想卡：果果椅" }, 19],
      [101, { text: "无配方卡" }, 19],
      [200, { text: "果果椅" }, 1],
      [300, { text: "木材" }, 1],
    ],
    325: [[100, null, null, null, "Icon.png"]],
    180: [
      [1, { text: "空卡集" }],
      [
        44,
        { text: "果果乐" },
        null,
        { text: "完成某位友邻的请求" },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "Cover.png",
      ],
      [999, { text: "其他创想卡" }],
    ],
    568: [recipe(100), recipe(102)],
    443: [[1010, null, 7]],
    444: [[7, 1, 100]],
    659: [
      [
        20,
        12,
        100,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        500,
        null,
        null,
        null,
        null,
        null,
        null,
        "SHOP_SALE_CONDITION_TRACKER_GOAL_DONE",
        "3533,0",
      ],
    ],
  };
}

function read(data: FixtureRows, finished: (callback: () => void) => void) {
  const fixture = createFixture(data);
  finished(fixture.cleanup);
  return readCraftingCards({ tables: fixture.input.tables, vocabulary: { sources: new Map() } });
}

test("保留卡片主档、空卡集与真实 ID，并仅沿配置 ID 建立关系", ({ onTestFinished }) => {
  const data = read(rows(), onTestFinished);
  expect(data.cards.map((card) => card.id)).toEqual([100, 101]);
  expect(data.sets.map((set) => set.id)).toEqual([1, 44, 999]);
  expect(data.cards[0]).toMatchObject({
    setId: 44,
    neighborIds: [1010],
    recipe: { productId: 200, quantity: 1, materials: [{ itemId: 300, quantity: 5 }] },
  });
  expect(data.cards[1]).toMatchObject({ setId: null, recipe: null, neighborIds: [] });
  expect(data.audit.find((entry) => entry.id === 102)?.disposition).toBe("orphan_card");
  expect(new Set(data.references)).toEqual(new Set([200, 300]));
  expect(data.imageReferences).toContainEqual({
    owner: "set",
    id: 44,
    field: "cover",
    reference: "Cover.png",
  });
});

test("保留售卖配置价格和未知币种，不推断商店或奖励含义", ({ onTestFinished }) => {
  const data = read(rows(), onTestFinished);
  expect(data.cards[0].trade?.offers?.[0]).toMatchObject({
    id: 20,
    goodsGroupId: 12,
    buyPrice: 500,
    currencyItemId: null,
    conditions: [
      { field: 17, kind: "SHOP_SALE_CONDITION_TRACKER_GOAL_DONE", parameters: "3533,0" },
    ],
  });
  expect(
    data.proofs
      .find((proof) => proof.owner === "card.neighborIds")
      ?.sources.map((source) => source.table),
  ).toEqual([443, 444]);
});

test("空材料保持未知；不完整、重复和不存在的材料拒绝交付", ({ onTestFinished }) => {
  const empty = rows();
  empty[568][0][12] = null;
  empty[568][0][13] = null;
  expect(read(empty, onTestFinished).cards[0].recipe).toMatchObject({
    materials: null,
    unresolvedReason: "material_slots_absent_semantics_unconfirmed",
  });
  for (const kind of ["missing", "duplicate", "unknown"] as const) {
    const invalid = rows();
    if (kind === "missing") invalid[568][0][13] = null;
    if (kind === "duplicate") invalid[568][0].push(300, 1);
    if (kind === "unknown") invalid[568][0][12] = 900;
    expect(() => read(invalid, onTestFinished)).toThrow(/crafting material/);
  }
});
