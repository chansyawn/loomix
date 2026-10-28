import { expect, test } from "vite-plus/test";
import type { ContentContext } from "../../content/context.ts";
import type { TableRow } from "../../types.ts";
import { acquisition, growth, trade, treeDrops } from "./client.ts";

interface FakeRow extends TableRow {
  values: Record<number, number | string | number[] | null>;
}

function row(root: number, id: number, values: FakeRow["values"]): FakeRow {
  return { root, rowOffset: id * 10, values: { 0: id, ...values } };
}

function context(rows: FakeRow[]) {
  const tables = {
    rows: (root: number) => rows.filter((entry) => entry.root === root),
    byId: (root: number) =>
      new Map(
        rows
          .filter((entry) => entry.root === root)
          .map((entry) => [entry.values[0] as number, entry]),
      ),
    id: (entry: FakeRow) => entry.values[0] as number,
    uint: (entry: FakeRow | undefined, field: number) => {
      const value = entry?.values[field];
      return typeof value === "number" ? value : null;
    },
    string: (entry: FakeRow | undefined, field: number) => {
      const value = entry?.values[field];
      return typeof value === "string" ? value : null;
    },
    vector: (entry: FakeRow | undefined, field: number) => {
      const value = entry?.values[field];
      return Array.isArray(value) ? value : null;
    },
    text: (entry: FakeRow | undefined, field: number) => {
      const value = entry?.values[field];
      return typeof value === "number" ? `text:${value}` : null;
    },
    textmap: {},
  };
  const main = new Set(rows.filter((entry) => entry.root === 318).map((entry) => entry.values[0]));
  return {
    tables,
    main: { has: (id: number) => main.has(id) },
    vocabulary: {
      sources: new Map(
        rows.filter((entry) => entry.root === 618).map((entry) => [entry.values[0], entry]),
      ),
    },
  } as unknown as ContentContext;
}

test("growth resolves mature crop stages only through configured entity and product IDs", () => {
  const crop = row(144, 30213, {
    3: "CYCLE_DAILY",
    4: [50161],
    5: 3,
    6: [50161],
    8: [50164],
    9: 50169,
    10: [30219],
  });
  const stage = row(137, 50164, { 1: 30219, 2: "CROP_TOMATO", 3: "RANK_1" });
  const result = growth(context([crop, stage]), crop);

  expect(result.value).toEqual({
    cycleMode: "CYCLE_DAILY",
    stageIds: [50161],
    regrowthStageIds: [50161],
    stages: [
      { id: 50161, name: null, image: null },
      { id: 50164, name: null, image: null },
      { id: 50169, name: null, image: null },
    ],
    matureStages: [{ entityId: 50164, productId: 30219, tag: "CROP_TOMATO", rank: "RANK_1" }],
    witheredStageId: 50169,
    maturityDays: null,
    harvestCount: 3,
  });
  expect(result.reason).toBe("stage_cycle_does_not_confirm_elapsed_days");
});

test("growth rejects a stage whose product is not referenced by its crop", () => {
  const crop = row(144, 30213, { 8: [50164], 10: [30219] });
  const stage = row(137, 50164, { 1: 30220 });

  expect(() => growth(context([crop, stage]), crop)).toThrow(/product mismatch/);
});

test("tree drops join by configured group and leave unsupported quantity and chance null", () => {
  const tree = row(708, 50193, { 1: 30161, 5: 40000 });
  const drop = row(563, 40000, { 1: 1, 2: 30108, 5: 270 });
  const result = treeDrops(context([tree, drop, row(318, 30161, {}), row(318, 30108, {})]), 50193);

  expect(result.value).toEqual([
    {
      itemId: 30161,
      dropGroupId: null,
      weight: null,
      quantityMin: null,
      quantityMax: null,
      probability: null,
    },
    {
      itemId: 30108,
      dropGroupId: 40000,
      weight: 270,
      quantityMin: null,
      quantityMax: null,
      probability: null,
    },
  ]);
  expect(result.reason).toBe("drop_quantity_and_probability_semantics_unconfirmed");
});

test("shop offers retain exact IDs and conditions but do not mislabel native fields as prices", () => {
  const offer = row(659, 9001, {
    1: 700,
    2: 30108,
    17: "SHOP_SALE_CONDITION_LEVEL",
    18: "5",
    22: 12,
    23: "SHOP_SALE_CONDITION_TIME",
    24: "night",
  });
  const result = trade(context([offer]), 30108);

  expect(result.value).toEqual({
    sellPrice: null,
    offers: [
      {
        id: 9001,
        goodsGroupId: 700,
        buyPrice: null,
        currencyItemId: null,
        stock: null,
        refresh: null,
        conditions: [
          { field: 17, kind: "SHOP_SALE_CONDITION_LEVEL", parameters: "5" },
          { field: 23, kind: "SHOP_SALE_CONDITION_TIME", parameters: "night" },
        ],
      },
    ],
  });
  expect(result.reason).toBe("commerce_price_stock_refresh_mapping_unconfirmed");
});

test("conflicting duplicate source vectors fail rather than merging unconfirmed acquisition mappings", () => {
  const first = row(325, 30108, { 2: [103] });
  const second = row(325, 30108, { 2: [104] });

  expect(() => acquisition(context([first, second]), 30108)).toThrow(/Conflicting source vectors/);
});
