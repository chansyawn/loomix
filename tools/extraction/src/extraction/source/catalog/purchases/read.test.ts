import { expect, test } from "vite-plus/test";
import { verifyPurchaseOffers } from "../../../../verify/purchases.ts";
import type { TableRow } from "../../../types.ts";
import { Tables } from "../../decode/tables.ts";
import type { DiscoveryEvidence } from "../../vignettes/inputs.ts";
import { fieldSource } from "./channels.ts";
import { readPurchaseOffers } from "./read.ts";

type Cells = Record<number, number | string>;
interface FixtureRow extends TableRow {
  cells: Cells;
}

function purchaseTables() {
  const text: Record<number, string> = {
    34261523: "格连商店",
    180227290: "络米电视购",
    157822501: "友邻衣橱",
    1783769208: "星空街市",
    1415967509: "万礼馆",
    2798898123: "用碎钱购买",
    88034602: "当「友邻服饰币」不足时，也可以使用等量碎钱换购",
    974612840: "魔术券可用街乐果冻",
    10: "碎钱",
    11: "碎钱",
    12: "足迹",
    13: "友邻服饰币",
    14: "万象礼券",
    15: "街乐果冻",
    21: "络米购物",
    22: "测试活动",
    23: "每日上新",
    24: "test测试活动",
    25: "用碎钱购买",
    216535044: "帮绵朵莉准备家具——找格连购买，粉白陶瓷杯",
    2452989747: "在络米电视购中，购买眠月睡袍，并为自己换装",
  };
  const rows: FixtureRow[] = [];
  function add(root: number, cells: Cells) {
    const row = { root, rowOffset: rows.length + 1, cells };
    rows.push(row);
    return row;
  }
  for (const [id, key, type] of [
    [10010, 10, 34],
    [200002, 11, 99],
    [200003, 12, 99],
    [200014, 13, 99],
    [200005, 14, 99],
    [200006, 15, 99],
  ] as const)
    add(318, { 0: id, 1: key, 2: type });
  add(661, { 0: 1, 1: "STORE_TYPE_NPC" });
  add(661, { 0: 8, 1: "STORE_TYPE_NPC_FRIEND" });
  add(665, { 0: 1, 1: 1, 6: 101, 11: "2026-01-01", 12: "2026-02-01" });
  add(665, { 0: 2, 1: 1, 6: 101 });
  add(665, { 0: 502, 1: 8, 6: 504 });
  add(712, { 0: 1, 2: 21, 3: 200003 });
  add(712, { 0: 2, 2: 22, 3: 200003 });
  add(713, { 0: 1, 4: 23, 6: 101 });
  add(713, { 0: 2, 4: 24, 6: 88 });
  add(713, { 0: 3, 4: 23, 6: 89 });
  add(713, { 0: 4, 4: 23 });
  add(714, { 0: 1, 1: 1, 6: "1,2,4,18,20" });
  add(714, { 0: 2, 1: 2, 6: "3" });
  add(714, { 0: 3, 1: 1, 6: "" });
  add(46, { 0: 1, 6: 81 });
  add(47, { 0: 1, 1: 81 });
  add(46, { 0: 2, 6: 82 });
  add(47, { 0: 2, 1: 82 });
  add(659, {
    0: 1,
    1: 101,
    2: 501,
    10: 2,
    7: 0,
    9: 5,
    17: "SHOP_SALE_CONDITION_LIMIT",
    18: "1",
    24: "orphan",
  });
  add(659, { 0: 2, 1: 101, 2: 502, 10: 300 });
  add(663, { 0: 2, 1: "SHOP_GOODS_PRICE_TYPE_DAILY_COUNT", 2: "0:100,1:200,2:200" });
  add(659, { 0: 3, 1: 101, 2: 501, 10: 2 });
  add(659, { 0: 4, 1: 101, 2: 503, 11: 200014 });
  add(659, { 0: 5, 1: 88, 2: 995, 10: 25, 11: 200003 });
  add(659, { 0: 6, 1: 89, 2: 996, 10: 25, 11: 200003 });
  add(659, { 0: 7, 1: 82, 2: 997 });
  add(659, { 0: 8101, 1: 81, 2: 200007, 10: 2 });
  add(663, { 0: 8101, 1: "SHOP_GOODS_PRICE_TYPE_DAILY_COUNT", 2: "0:0,1:2" });
  for (const [id, item, price] of [
    [50301, 1161381, 1000],
    [50302, 1161380, 1500],
    [50303, 1161382, 1000],
  ] as const)
    add(659, { 0: id, 1: 503, 2: item, 10: price, 11: 200014 });
  add(672, { 0: 1, 1: 2256, 4: 25, 5: 200005 });
  add(672, { 0: 2, 1: 2255, 4: 35, 5: 200005 });
  add(672, { 0: 9, 1: 2190, 4: 0, 5: 200005 });
  add(672, { 0: 9, 1: 2191, 5: 200005 });
  add(672, { 0: 9, 1: 2192, 4: 0 });
  add(672, { 0: 9, 1: 2193 });
  add(672, { 0: 9, 1: 2194, 4: 50, 5: 10010 });
  add(325, { 0: 501, 13: 25, 14: 5 });
  const tables = Object.assign(Object.create(Tables.prototype) as Tables, {
    rows: (root: number) => rows.filter((row) => row.root === root),
    uint: (row: FixtureRow | undefined, field: number, fallback: number | null = null) => {
      const value = row?.cells[field];
      return typeof value === "number" ? value : fallback;
    },
    string: (row: FixtureRow | undefined, field: number) => {
      const value = row?.cells[field];
      return typeof value === "string" ? value : null;
    },
    textmap: Object.fromEntries(
      Object.entries(text).map(([key, nameZh], index) => [
        key,
        { nameZh, rowOffset: 1000 + index, nameEn: null, index },
      ]),
    ),
  });
  function cells(root: number, id: number) {
    return rows.find((row) => row.root === root && row.cells[0] === id)!.cells;
  }
  const conditions = new Map<number, unknown>();
  const discovery: Pick<DiscoveryEvidence, "tracker"> = {
    tracker(key) {
      if (conditions.has(key))
        return {
          condition: conditions.get(key),
          source: {
            kind: "assetJson",
            file: "prepared/vignette-discovery/4f3420ed.json",
            source: "game/quests",
            pathId: "13",
            pointer: `/${key}/conditionjson`,
            sha256: "a".repeat(64),
          },
        };
    },
  };
  return { tables, cells, add, conditions, discovery };
}

function extract(fixture = purchaseTables(), revision = 0) {
  const result = readPurchaseOffers(fixture.tables, fixture.discovery, revision);
  const verify = () =>
    verifyPurchaseOffers(
      result.data,
      result.proofs,
      fixture.tables,
      result.diagnostics,
      revision,
      fixture.discovery,
    );
  function offerProof(id: string, field: string) {
    return result.proofs.find((proof) => proof.entity.id === id && proof.fieldPath === field)!;
  }
  return { ...fixture, ...result, verify, offerProof };
}

test("同一商品按店分别报价，同店合并入口并保留同价商品各自的来源", () => {
  const { data, diagnostics, verify, offerProof } = extract();
  expect(verify).not.toThrow();
  const offers = data.purchaseOffers.filter((offer) => offer.deliveredItemId === 501);
  expect(offers.map(({ id, currencyItemId, price }) => [id, currencyItemId, price])).toEqual([
    ["gelian:1", 200002, { kind: "fixed", amount: 2 }],
    ["gelian:3", 200002, { kind: "fixed", amount: 2 }],
    ["luomiTv:1", 200003, { kind: "fixed", amount: 2 }],
    ["luomiTv:3", 200003, { kind: "fixed", amount: 2 }],
  ]);
  expect(
    offerProof("gelian:1", "shopId").sources.filter(
      (source) => source.kind === "table" && source.table === 665,
    ),
  ).toHaveLength(2);
  expect(diagnostics.rows[0]).toMatchObject({
    amount: 2,
    currency: null,
    conditions: [
      { field: 17, kind: "SHOP_SALE_CONDITION_LIMIT", parameters: "1" },
      { field: 23, kind: null, parameters: "orphan" },
    ],
  });
  expect(diagnostics.rows[0]!.numericCandidates).toEqual(
    expect.arrayContaining([
      { field: 7, nativeValue: 0 },
      { field: 8, nativeValue: null },
      { field: 9, nativeValue: 5 },
    ]),
  );
  expect(diagnostics.rows.find((entry) => entry.goodsId === 2)).toMatchObject({
    amount: 300,
    rawTier: "0:100,1:200,2:200",
  });
  expect(data.purchaseOffers.find((offer) => offer.id === "luomiTv:2")?.price).toEqual({
    kind: "dailyPurchaseCount",
    entries: [
      { purchasedToday: 0, amount: 100 },
      { purchasedToday: 1, amount: 200 },
      { purchasedToday: 2, amount: 200 },
    ],
  });
  expect(data.purchaseOffers.find((offer) => offer.id === "starryMarket:8101")).toMatchObject({
    currencyItemId: 200006,
    price: {
      kind: "dailyPurchaseCount",
      entries: [
        { purchasedToday: 0, amount: 0 },
        { purchasedToday: 1, amount: 2 },
      ],
    },
  });
});

const startsAt = "2026-08-27 12:00:00";
const endsAt = "2026-09-03 12:00:00";
const shelfNote = "任务/限时货架";

test("同店按直接交付物、币种和完整价格规则比较；零价、异序和未注明的入口分别保留", () => {
  const fixture = purchaseTables();
  const { add, cells } = fixture;
  add(665, { 0: 70, 1: 1, 6: 3114, 11: startsAt, 12: endsAt });
  add(659, { 0: 21, 1: 3114, 2: 800, 10: 0 });
  add(659, { 0: 22, 1: 101, 2: 800, 10: 0 });
  add(663, { 0: 21, 1: "SHOP_GOODS_PRICE_TYPE_DAILY_COUNT", 2: "0:0,1:2" });
  add(663, { 0: 22, 1: "SHOP_GOODS_PRICE_TYPE_DAILY_COUNT", 2: "0:0,1:2" });
  add(659, { 0: 23, 1: 3114, 2: 801, 10: 100 });
  add(659, { 0: 24, 1: 3114, 2: 800, 10: 100, 11: 200014 });
  const sameRule = extract(fixture);
  expect(sameRule.data.purchaseOffers.every((offer) => !offer.note)).toBe(true);
  expect(sameRule.verify).not.toThrow();
  cells(663, 22)[2] = "0:0,1:3";
  const mixed = extract(fixture);
  const noted = mixed.data.purchaseOffers.filter((offer) => offer.note);
  expect(noted.map(({ id, note }) => [id, note])).toEqual([["gelian:21", shelfNote]]);
  expect(mixed.verify).not.toThrow();
  mixed.data.purchaseOffers.reverse();
  expect(mixed.verify).not.toThrow();
  const proof = mixed.offerProof("gelian:21", "note");
  const original = proof.sources;
  proof.sources = proof.sources.filter((source) => source.kind !== "table" || source.table !== 663);
  expect(mixed.verify).toThrow("Independent field evidence sources");
  proof.sources = original;
  noted[0]!.note = "常驻货架";
  expect(mixed.verify).toThrow("Frozen shelf note gelian:21");
  add(665, { 0: 71, 1: 1, 6: 3114 });
  const mixedPages = extract(fixture);
  expect(mixedPages.data.purchaseOffers.every((offer) => !offer.note)).toBe(true);
  expect(mixedPages.verify).not.toThrow();
});

test("修订、商品行、追踪目标与任务文案共同证明短注，同价的任务和限时来源可以并存", () => {
  const fixture = purchaseTables();
  const { add, cells, conditions } = fixture;
  add(665, { 0: 49, 1: 1, 6: 3093 });
  add(665, { 0: 70, 1: 1, 6: 3114, 11: startsAt, 12: endsAt });
  add(659, { 0: 305302, 1: 101, 2: 1155, 10: 100 });
  add(659, { 0: 311401, 1: 3114, 2: 1155, 10: 150 });
  const taskCells = {
    0: 309306,
    1: 3093,
    2: 1155,
    10: 150,
    17: "SHOP_SALE_CONDITION_TRACKER_GOAL_DONE",
    18: "3551,0",
    23: "SHOP_SALE_CONDITION_TRACKER_GOAL_DONE",
    24: "3507,0",
  };
  add(659, taskCells);
  add(659, { ...taskCells, 0: 999 });
  add(659, { ...taskCells, 0: 302, 1: 101, 2: 60515, 10: 1500, 18: "3509,0", 24: "3510,0" });
  add(659, { 0: 515, 1: 101, 2: 60515, 10: 1800 });
  conditions.set(3551, { thresh: 1, finishTaskCount: { taskIds: [12002052] } });
  conditions.set(3507, { thresh: 1, finishTaskCount: { taskIds: [12002018] } });
  conditions.set(3509, { taskStage: { taskId: 4319 } });
  conditions.set(3510, { taskStage: { taskId: 4323 } });
  const current = () => extract(fixture, 1449213);
  const notes = () =>
    current()
      .data.purchaseOffers.filter((offer) => offer.note)
      .map(({ id, note }) => [id, note]);
  expect(notes()).toEqual([
    ["gelian:309306", shelfNote],
    ["gelian:311401", shelfNote],
    ["luomiTv:302", shelfNote],
  ]);
  const result = current();
  const proof = result.offerProof("gelian:309306", "note");
  expect(
    proof.sources.filter((source) => source.kind === "assetJson").map((source) => source.pointer),
  ).toEqual(["/3551/conditionjson", "/3507/conditionjson"]);
  proof.sources = proof.sources.filter((source) => source.kind !== "assetJson");
  expect(result.verify).toThrow("Independent field evidence sources");
  const taskPage = cells(665, 49);
  Object.assign(taskPage, { 11: startsAt, 12: endsAt });
  const overlap = current();
  expect(overlap.data.purchaseOffers.find((offer) => offer.id === "gelian:309306")?.note).toBe(
    shelfNote,
  );
  const overlapProof = overlap.offerProof("gelian:309306", "note");
  expect(overlapProof.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "assetJson", pointer: "/3551/conditionjson" }),
      expect.objectContaining({ kind: "table", table: 665, fields: [11, 12] }),
    ]),
  );
  delete taskPage[11];
  delete taskPage[12];
  expect(
    extract(fixture, 1449214)
      .data.purchaseOffers.filter((offer) => offer.note)
      .map((offer) => offer.id),
  ).toEqual(["gelian:311401"]);
  cells(659, 305302)[10] = 150;
  expect(notes()).toEqual([["luomiTv:302", shelfNote]]);
  cells(659, 305302)[10] = 100;
  conditions.set(3551, { thresh: 1, finishTaskCount: { taskIds: [4319] } });
  conditions.delete(3510);
  expect(notes()).toEqual([["gelian:311401", shelfNote]]);
});

test("衣橱说明点名两种货币，字段依据绑定教程与各自的物品身份", () => {
  const { data, verify, offerProof } = extract();
  expect(data.shops.filter((shop) => shop.paymentNote)).toEqual([
    {
      id: "neighborWardrobe",
      name: "友邻衣橱",
      paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
    },
  ]);
  const proof = offerProof("neighborWardrobe", "paymentNote");
  proof.sources = proof.sources.slice(0, 3);
  expect(verify).toThrow("Independent field evidence sources");
});

test("万礼馆按复合 ID 保留礼品，缺价、缺币和同名假币保留原值与各自原因", () => {
  const { data, diagnostics, verify } = extract();
  expect(
    data.purchaseOffers
      .filter((entry) => entry.shopId === "giftGallery")
      .map(({ id, price }) => [id, price]),
  ).toEqual([
    ["giftGallery:1:2256", { kind: "fixed", amount: 25 }],
    ["giftGallery:2:2255", { kind: "fixed", amount: 35 }],
    ["giftGallery:9:2190", { kind: "fixed", amount: 0 }],
  ]);
  expect(
    diagnostics.giftRows
      .slice(3)
      .map(({ itemId, amount, currency, reasons }) => [itemId, amount, currency, reasons]),
  ).toEqual([
    [2191, null, 200005, ["amount_missing"]],
    [2192, 0, null, ["currency_unconfirmed"]],
    [2193, null, null, ["currency_unconfirmed", "amount_missing"]],
    [2194, 50, 10010, ["currency_unconfirmed"]],
  ]);
  diagnostics.giftRows[3]!.amount = 0;
  expect(verify).toThrow("Frozen gift diagnostic 9:2191");
});

test("空入口、测试店和测试页保留路径；无入口组 503 三件完整保留候选", () => {
  const { data, diagnostics, verify } = extract();
  expect(diagnostics.emptyGroups).toEqual([504]);
  expect(diagnostics.missingTvPages).toEqual([18, 20]);
  expect(diagnostics.tvPageLinks.map(({ pageId, reason }) => [pageId, reason])).toEqual([
    [1, "linked"],
    [2, "test_page"],
    [4, "empty_page"],
    [18, "missing_page"],
    [20, "missing_page"],
    [3, "test_page"],
    [null, "empty_tab"],
  ]);
  expect(
    diagnostics.rows
      .filter((entry) => entry.groupId === 503)
      .map(({ itemId, amount, currency, outcomes }) => [itemId, amount, currency, outcomes]),
  ).toEqual(
    [
      [1161381, 1000],
      [1161380, 1500],
      [1161382, 1000],
    ].map(([item, amount]) => [
      item,
      amount,
      200014,
      [{ shopId: null, reason: "unlinked_goods_group" }],
    ]),
  );
  expect(
    diagnostics.rows
      .filter((entry) => [88, 89].includes(entry.groupId))
      .map(({ outcomes }) => outcomes),
  ).toEqual([[{ shopId: null, reason: "test_page" }], [{ shopId: null, reason: "test_page" }]]);
  expect(diagnostics.rows.find((entry) => entry.groupId === 82)?.outcomes).toEqual([
    { shopId: "starryMarket", reason: "currency_unconfirmed" },
    { shopId: "starryMarket", reason: "amount_missing" },
  ]);
  expect(
    data.purchaseOffers.some((entry) =>
      [1161381, 1161380, 1161382, 995, 996].includes(entry.deliveredItemId),
    ),
  ).toBe(false);
  diagnostics.rows.find((entry) => entry.groupId === 503)!.outcomes = [];
  expect(verify).toThrow("Frozen goods diagnostic 50301");
});

test("独立验收拒绝报价与依据一起改指同名碎钱、同值无关文案和同价商品行", () => {
  const { data, tables, offerProof, verify } = extract();
  const offer = data.purchaseOffers.find((entry) => entry.id === "gelian:1")!;
  const proof = offerProof(offer.id, "currencyItemId");
  const original = proof.sources;
  offer.currencyItemId = 10010;
  proof.sources = original.map((source) =>
    source.kind === "table" && source.table === 318
      ? fieldSource(tables.byId(318).get(10010)!, [0, 1, 2])
      : source,
  );
  expect(verify).toThrow("Frozen purchase gelian:1");
  offer.currencyItemId = 200002;
  expect(verify).toThrow("Independent field evidence sources");
  proof.sources = original.map((source) =>
    source.kind === "table" && source.rowOffset === tables.textmap[2798898123]!.rowOffset
      ? { ...source, rowOffset: tables.textmap[25]!.rowOffset }
      : source,
  );
  expect(verify).toThrow("Independent field evidence sources");
  proof.sources = original;
  offerProof(offer.id, "price").sources = offerProof("gelian:3", "price").sources;
  expect(verify).toThrow("Independent field evidence sources");
});

test("独立验收从冻结表检查货币类型、名称和入口诊断", () => {
  const { cells, diagnostics, verify } = extract();
  const currency = cells(318, 200002);
  currency[2] = 34;
  expect(verify).toThrow("Frozen currency type 200002");
  currency[2] = 99;
  currency[1] = 12;
  expect(verify).toThrow("Frozen currency name 200002");
  currency[1] = 11;
  diagnostics.entrances[0]!.startsAt = null;
  expect(verify).toThrow("Frozen purchase entrances");
  diagnostics.entrances[0]!.startsAt = "2026-01-01";
  diagnostics.tvPageLinks.at(-1)!.reason = "missing_page";
  expect(verify).toThrow("Frozen TV page links");
});

test.each(["0:0,0:2", "1:2,0:0", "0:", "0:9007199254740992"])(
  "商品次数价 %s 解析失败时中止",
  (raw) => {
    const { tables, cells, discovery } = purchaseTables();
    cells(663, 2)[2] = raw;
    expect(() => readPurchaseOffers(tables, discovery, 0)).toThrow();
  },
);

test("相同万礼馆复合身份的冲突价格中止提取", () => {
  const { tables, add, discovery } = purchaseTables();
  add(672, { 0: 1, 1: 2256, 4: 50, 5: 200005 });
  expect(() => readPurchaseOffers(tables, discovery, 0)).toThrow("Duplicate gift row");
});
