import { expect, test } from "vite-plus/test";
import type { ContentContext } from "../../content/context.ts";
import type { TableRow } from "../../types.ts";
import { acquisition, creatureSize, growth, trade } from "./client.ts";

import { treeDrops } from "./tree-drops.ts";
import { treeInvestigation } from "./tree-investigation.ts";
import { verifyTreeDrops, verifyTreeInvestigation } from "../../../verify/tree-drops.ts";
import { verifyProofSources } from "../../../verify/collection.ts";
import { CollectionEvidenceBuilder } from "../evidence.ts";

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
    float: (entry: FakeRow | undefined, field: number) => {
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
      scales: new Map(
        rows.filter((entry) => entry.root === 132).map((entry) => [entry.values[0], entry]),
      ),
    },
  } as unknown as ContentContext;
}

test("creature size multiplies table endpoints by the configured size factor", () => {
  const scale = row(132, 43052, { 3: 100, 4: 26, 5: 46, 6: 0.2 });
  const result = creatureSize(context([scale]), 43052);

  expect(result.value).toEqual({ min: 5.2, max: 9.2, unit: "厘" });
  expect(result.sources).toEqual([
    {
      file: "prepared/ed.obb",
      table: 132,
      row: 43052,
      rowOffset: 430520,
      fields: [0, 3, 4, 5, 6],
    },
  ]);
});

test("creature size remains null for incomplete settings and rejects inverted ranges", () => {
  const incomplete = creatureSize(context([row(132, 41001, { 4: 60 })]), 41001);
  expect(incomplete.value).toBeNull();

  const missingMultiplier = creatureSize(context([row(132, 41001, { 4: 60, 5: 120 })]), 41001);
  expect(missingMultiplier.value).toBeNull();

  expect(() => creatureSize(context([row(132, 41001, { 4: 120, 5: 60 })]), 41001)).toThrow(
    /minimum size exceeds maximum/,
  );
});

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
  expect(result.reason).toBe("drop_mode_or_positive_total_weight_unconfirmed");
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

function weightedTree(weights: number[], mode = 2) {
  const rewards = weights.map((weight, index) => ({
    ...row(563, 40000, { 1: mode, 2: 30100 + index, 4: 1, 5: weight, 15: index === 3 ? 1 : null }),
    rowOffset: 400000 + index,
  }));
  return context([
    row(708, 50193, { 1: 30161, 2: 3, 3: "65,30,5", 5: 40000 }),
    row(318, 30161, {}),
    ...weights.map((_, index) => row(318, 30100 + index, {})),
    ...rewards,
    row(327, 1, { 1: 2, 2: 2 }),
  ]);
}

test.each([
  [630, 270, 25, 18, 19, 19, 19],
  [630, 270, 25, 32],
  [630, 270, 25, 28],
  [630, 270, 25],
  [1000],
  [0, 1000],
])("砍树概率按完整掉落组归一化，不补空奖或排除附加规则条目：%j", (...weights) => {
  const source = weightedTree(weights);
  const result = treeDrops(source, 50193);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  expect(result.value?.slice(1).map((drop) => drop.probability)).toEqual(
    weights.map((weight) => weight / total),
  );
  expect(result.value?.[0].probability).toBeNull();
  expect(
    result.value?.every((drop) => drop.quantityMin === null && drop.quantityMax === null),
  ).toBe(true);
  expect(result.sources.filter((entry) => entry.table === 563)).toHaveLength(weights.length);
  verifyTreeDrops(source.tables, 50193, result.value);
});

test("未知模式和零总权重保持概率为空，非法配置停止提取", () => {
  for (const source of [weightedTree([270, 630], 1), weightedTree([0, 0])]) {
    const result = treeDrops(source, 50193);
    expect(result.value?.every((drop) => drop.probability === null)).toBe(true);
    verifyTreeDrops(source.tables, 50193, result.value);
  }
  for (const weights of [[-1], [0.5], [Number.NaN]])
    expect(() => treeDrops(weightedTree(weights), 50193)).toThrow(/Invalid tree drop weight/);
  expect(() => treeDrops(context([row(708, 1, { 5: 99 })]), 1)).toThrow(/Missing tree drop group/);
  expect(() => treeDrops(context([row(708, 1, { 1: 99 })]), 1)).toThrow(/Unresolved tree fruit/);
  expect(() =>
    treeDrops(context([row(708, 1, { 5: 99 }), row(563, 99, { 1: 2, 2: 3, 5: 1 })]), 1),
  ).toThrow(/Unresolved tree drop item/);
  expect(treeDrops(context([row(708, 1, {})]), 1).value).toBeNull();
});

test("独立校验拒绝概率、权重和掉落条目篡改", () => {
  const source = weightedTree([630, 270, 25]);
  const value = treeDrops(source, 50193).value!;
  for (const changed of [
    value.slice(0, -1),
    value.map((drop, index) => (index === 1 ? { ...drop, weight: 629 } : drop)),
    value.map((drop, index) => (index === 1 ? { ...drop, probability: 0.63 } : drop)),
  ])
    expect(() => verifyTreeDrops(source.tables, 50193, changed)).toThrow(/Independent tree drops/);
});

test("来源验证要求同组每一行参与概率分母", () => {
  const source = weightedTree([630, 270, 25]);
  const result = treeDrops(source, 50193);
  const builder = new CollectionEvidenceBuilder();
  builder.put(
    "item",
    50193,
    "detail.treeDrops",
    result.value,
    result.sources,
    "ID 关联",
    "整组权重归一化",
  );
  const proof = builder.records[0]!;
  verifyProofSources(proof, source.tables);
  expect(() =>
    verifyProofSources({ ...proof, sources: proof.sources.slice(0, -1) }, source.tables),
  ).toThrow(/Complete joined source rows/);
});

test("全树调查保留未确认候选并拒绝遗漏、候选值和来源篡改", () => {
  const source = weightedTree([630, 270, 25]);
  const records = treeInvestigation(source.tables);
  verifyTreeInvestigation(source.tables, records);
  expect(records[0]?.candidates).toMatchObject({ totalWeight: 925, fruitWeights: "65,30,5" });
  expect(() => verifyTreeInvestigation(source.tables, [])).toThrow();
  expect(() =>
    verifyTreeInvestigation(
      source.tables,
      records.map((record) => ({
        ...record,
        candidates: { ...record.candidates, fruitWeights: "65,35,5" },
      })),
    ),
  ).toThrow();
  expect(() =>
    verifyTreeInvestigation(
      source.tables,
      records.map((record) => ({ ...record, sources: record.sources.slice(0, -1) })),
    ),
  ).toThrow();
});
