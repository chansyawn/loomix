import assert from "node:assert/strict";
import type { PurchaseCatalog, PurchaseOffer, PurchasePrice, Shop } from "@loomix/schema/catalog";
import type { FieldEvidence, TableFieldSource } from "../extraction/evidence/domain-schema.ts";
import { fieldSource, textSource } from "../extraction/source/catalog/purchases/channels.ts";
import type { readPurchaseOffers } from "../extraction/source/catalog/purchases/read.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";
import { verifyFieldSources } from "./evidence.ts";

type Diagnostics = ReturnType<typeof readPurchaseOffers>["diagnostics"];
type Entrance = Diagnostics["entrances"][number];

function frozenEntrances(tables: Tables, diagnostics: Diagnostics) {
  const entrances: Entrance[] = [];
  const stores = tables.byId(661);
  for (const page of tables.rows(665)) {
    const owner = tables.uint(page, 1);
    if (owner !== 1 && owner !== 8) continue;
    const store = stores.get(owner);
    assert.ok(store);
    assert.equal(tables.string(store, 1), owner === 8 ? "STORE_TYPE_NPC_FRIEND" : "STORE_TYPE_NPC");
    const groupId = tables.uint(page, 6);
    assert.ok(groupId);
    entrances.push({
      shopId: owner === 8 ? "neighborWardrobe" : "gelian",
      pageId: tables.id(page),
      groupId,
      startsAt: tables.string(page, 11),
      endsAt: tables.string(page, 12),
      sources: [fieldSource(store, [0, 1]), fieldSource(page, [0, 1, 6])],
      currency:
        owner === 8 ? null : { id: 200002, source: textSource(tables, 2798898123, "用碎钱购买") },
    });
  }

  const tvStores = tables.byId(712);
  const pages = tables.byId(713);
  const links: Diagnostics["tvPageLinks"] = [];
  for (const tab of tables.rows(714)) {
    const store = tvStores.get(tables.uint(tab, 1));
    assert.ok(store);
    const storeId = tables.id(store);
    const storeName = tables.text(store, 2);
    assert.ok(storeName);
    const testStore = /测试|test/i.test(storeName);
    if (storeId !== 1 && !testStore) continue;
    const pageList = tables.string(tab, 6);
    const tabId = tables.id(tab);
    const tabSources = [fieldSource(store, [0, 2]), fieldSource(tab, [0, 1, 6])];
    const pageIds = pageList
      ? pageList.split(",").map((token) => {
          assert.match(token, /^\d+$/);
          return Number(token);
        })
      : [null];
    for (const pageId of pageIds) {
      const page = pages.get(pageId);
      const groupId = tables.uint(page, 6);
      const pageName = tables.text(page, 4);
      if (page && groupId) assert.ok(pageName);
      const sources = page ? [...tabSources, fieldSource(page, [0, 4, 6])] : tabSources;
      const reason =
        pageId === null
          ? "empty_tab"
          : !page
            ? "missing_page"
            : !groupId
              ? "empty_page"
              : testStore || /测试|test/i.test(pageName!)
                ? "test_page"
                : "linked";
      links.push({ storeId, tabId, pageList, pageId, groupId, sources, reason });
      if (reason !== "linked") continue;
      const payment = tables.uint(store, 3);
      entrances.push({
        shopId: "luomiTv",
        pageId: pageId!,
        groupId: groupId!,
        startsAt: null,
        endsAt: null,
        sources,
        currency: payment === null ? null : { id: payment, source: fieldSource(store, [0, 3]) },
      });
    }
  }
  assert.deepEqual(diagnostics.tvPageLinks, links, "Frozen TV page links");
  const missingPages = new Set(
    links.filter((link) => link.reason === "missing_page").map((link) => link.pageId!),
  );
  assert.deepEqual(
    diagnostics.missingTvPages,
    [...missingPages].sort((left, right) => left - right),
    "Frozen missing TV pages",
  );

  const labels = tables.byId(46);
  for (const page of tables.rows(47)) {
    const pageId = tables.id(page);
    const label = labels.get(pageId);
    const groupId = tables.uint(page, 1);
    assert.ok(label && groupId);
    assert.equal(tables.uint(label, 6), groupId);
    entrances.push({
      shopId: "starryMarket",
      pageId,
      groupId,
      startsAt: null,
      endsAt: null,
      currency: null,
      sources: [fieldSource(page, [0, 1]), fieldSource(label, [0, 4, 6])],
    });
  }
  assert.deepEqual(diagnostics.entrances, entrances, "Frozen purchase entrances");
  const groups = new Map<number, Map<Shop["id"], Entrance[]>>();
  for (const entry of entrances) {
    const shops = groups.get(entry.groupId) ?? new Map<Shop["id"], Entrance[]>();
    shops.set(entry.shopId, [...(shops.get(entry.shopId) ?? []), entry]);
    groups.set(entry.groupId, shops);
  }
  const testGroups = new Set(
    links.filter((link) => link.reason === "test_page").map((link) => link.groupId),
  );
  return { groups, testGroups };
}

function frozenCurrencies(tables: Tables) {
  const names = new Map([
    [200002, "碎钱"],
    [200003, "足迹"],
    [200005, "万象礼券"],
    [200006, "街乐果冻"],
    [200014, "友邻服饰币"],
  ]);
  const rows = tables.byId(318, undefined, new Set(names.keys()));
  return (id: number | null) => {
    if (id === null || !names.has(id)) return null;
    const row = rows.get(id);
    const textKey = tables.uint(row, 1);
    assert.ok(row && textKey !== null, `Missing frozen currency ${id}`);
    assert.equal(tables.uint(row, 2), 99, `Frozen currency type ${id}`);
    const name = names.get(id)!;
    assert.equal(tables.textmap[textKey]?.nameZh, name, `Frozen currency name ${id}`);
    return [fieldSource(row, [0, 1, 2]), textSource(tables, textKey, name)];
  };
}

function frozenPrice(
  tables: Tables,
  row: TableRow,
  tier: TableRow | undefined,
): PurchasePrice | null {
  if (!tier) {
    const amount = tables.uint(row, 10);
    return amount === null ? null : { kind: "fixed", amount };
  }
  assert.equal(tables.string(tier, 1), "SHOP_GOODS_PRICE_TYPE_DAILY_COUNT");
  const raw = tables.string(tier, 2);
  assert.ok(raw);
  let previous = -1;
  const entries = raw.split(",").map((part) => {
    const match = /^(\d+):(\d+)$/.exec(part);
    assert.ok(match, `Invalid frozen daily price ${raw}`);
    const purchasedToday = Number(match[1]);
    const amount = Number(match[2]);
    assert.ok(
      Number.isSafeInteger(purchasedToday) &&
        purchasedToday > previous &&
        Number.isSafeInteger(amount),
    );
    previous = purchasedToday;
    return { purchasedToday, amount };
  });
  return { kind: "dailyPurchaseCount", entries };
}

function checkSnapshot1449213(catalog: PurchaseCatalog, diagnostics: Diagnostics) {
  assert.equal(catalog.purchaseOffers.length, 2724);
  const wardrobe = catalog.purchaseOffers.filter((offer) => offer.shopId === "neighborWardrobe");
  assert.equal(wardrobe.length, 182);
  assert.equal(new Set(wardrobe.map((offer) => offer.deliveredItemId)).size, 91);
  const candidates = diagnostics.rows.filter((row) => row.groupId === 503);
  assert.deepEqual(
    candidates.map(({ goodsId, itemId, amount, currency }) => [goodsId, itemId, amount, currency]),
    [
      [50301, 1161381, 1000, 200014],
      [50302, 1161380, 1500, 200014],
      [50303, 1161382, 1000, 200014],
    ],
  );
  for (const candidate of candidates) {
    assert.deepEqual(candidate.outcomes, [{ shopId: null, reason: "unlinked_goods_group" }]);
    assert.ok(!wardrobe.some((offer) => offer.deliveredItemId === candidate.itemId));
  }
  assert.deepEqual(diagnostics.missingTvPages, [18, 20]);
  assert.deepEqual(diagnostics.emptyGroups, [504]);
  assert.equal(diagnostics.giftRows.length, 14);
}

export function verifyPurchaseOffers(
  catalog: PurchaseCatalog,
  fields: FieldEvidence[],
  tables: Tables,
  diagnostics: Diagnostics,
  dataRevision: number,
) {
  const { groups, testGroups } = frozenEntrances(tables, diagnostics);
  const currencyIdentity = frozenCurrencies(tables);
  const evidence = new Map<string | number, FieldEvidence[]>();
  for (const field of fields) {
    if (
      field.entity.collection !== "catalog.purchaseOffers" &&
      field.entity.collection !== "catalog.shops"
    )
      continue;
    const proofs = evidence.get(field.entity.id) ?? [];
    proofs.push(field);
    evidence.set(field.entity.id, proofs);
  }
  const names = [
    ["gelian", "格连商店", 34261523],
    ["luomiTv", "络米电视购", 180227290],
    ["neighborWardrobe", "友邻衣橱", 157822501],
    ["starryMarket", "星空街市", 1783769208],
    ["giftGallery", "万礼馆", 1415967509],
  ] as const;
  assert.deepEqual(catalog.shops.map((shop) => shop.id).sort(), names.map(([id]) => id).sort());
  for (const [id, name, key] of names) {
    const shop = catalog.shops.find((entry) => entry.id === id)!;
    const proofs = evidence.get(id) ?? [];
    assert.equal(shop.name, name);
    verifyFieldSources(proofs, "catalog.shops", id, "name", [textSource(tables, key, name)]);
    const rule =
      id === "neighborWardrobe"
        ? { kind: "oneToOne", primaryCurrencyItemId: 200014, substituteCurrencyItemId: 200002 }
        : null;
    assert.deepEqual(shop.shortfallPayment, rule);
    verifyFieldSources(
      proofs,
      "catalog.shops",
      id,
      "shortfallPayment",
      rule
        ? [
            textSource(tables, 88034602, "当「友邻服饰币」不足时，也可以使用等量碎钱换购"),
            ...currencyIdentity(200014)!,
            ...currencyIdentity(200002)!,
          ]
        : [],
      rule ? "confirmed" : "unresolved",
      rule ? null : "no_confirmed_shortfall_rule",
    );
  }

  const remaining = new Map(catalog.purchaseOffers.map((offer) => [offer.id, offer]));
  assert.equal(remaining.size, catalog.purchaseOffers.length, "Duplicate published purchase offer");
  function check(
    expected: PurchaseOffer,
    sources: Record<Exclude<keyof PurchaseOffer, "id">, TableFieldSource[]>,
  ) {
    assert.deepEqual(remaining.get(expected.id), expected, `Frozen purchase ${expected.id}`);
    remaining.delete(expected.id);
    for (const [key, value] of Object.entries(sources))
      verifyFieldSources(
        evidence.get(expected.id) ?? [],
        "catalog.purchaseOffers",
        expected.id,
        key,
        value,
      );
  }

  const tiers = tables.byId(663);
  const goods = tables.byId(659);
  const goodsGroups = new Set<number>();
  for (const id of tiers.keys()) assert.ok(goods.has(id), `Orphan frozen daily price ${id}`);
  assert.equal(diagnostics.rows.length, goods.size, "Frozen goods coverage");
  const records = new Map(diagnostics.rows.map((entry) => [entry.goodsId, entry]));
  for (const row of goods.values()) {
    const goodsId = tables.id(row);
    const groupId = tables.uint(row, 1);
    const itemId = tables.uint(row, 2);
    assert.ok(groupId && itemId);
    goodsGroups.add(groupId);
    const tier = tiers.get(goodsId);
    const price = frozenPrice(tables, row, tier);
    const currency = tables.uint(row, 11);
    const outcomes: Diagnostics["rows"][number]["outcomes"] = [];
    const shops = groups.get(groupId);
    if (!shops)
      outcomes.push({
        shopId: null,
        reason: testGroups.has(groupId) ? "test_page" : "unlinked_goods_group",
      });
    for (const [shopId, pages] of shops ?? []) {
      const shopSources = [fieldSource(row, [0, 1]), ...pages.flatMap((entry) => entry.sources)];
      let payment = currency;
      let source = fieldSource(row, [0, 11]);
      if (currency === null) {
        const configured = pages[0]!.currency;
        assert.ok(pages.every((page) => page.currency?.id === configured?.id));
        if (configured) {
          payment = configured.id;
          source = configured.source;
        } else if (shopId === "starryMarket" && goodsId === 8101 && itemId === 200007) {
          payment = 200006;
          source = textSource(tables, 974612840, "魔术券可用街乐果冻");
        }
      }
      const identity = currencyIdentity(payment);
      if (identity === null) outcomes.push({ shopId, reason: "currency_unconfirmed" });
      if (price === null) outcomes.push({ shopId, reason: "amount_missing" });
      if (identity && payment !== null && price) {
        check(
          {
            id: `${shopId}:${goodsId}`,
            shopId,
            deliveredItemId: itemId,
            currencyItemId: payment,
            price,
          },
          {
            shopId: shopSources,
            deliveredItemId: [fieldSource(row, [0, 2])],
            currencyItemId: [
              ...(currency === null ? [fieldSource(row, [0, 1, 2, 11]), ...shopSources] : []),
              source,
              ...identity,
            ],
            price: [tier ? fieldSource(tier, [0, 1, 2]) : fieldSource(row, [0, 10])],
          },
        );
        outcomes.push({ shopId, reason: "admitted" });
      }
    }
    const conditions = [17, 23]
      .map((field) => ({
        field,
        kind: tables.string(row, field),
        parameters: tables.string(row, field + 1),
      }))
      .filter(({ kind, parameters }) => kind !== null || parameters !== null);
    for (const condition of conditions)
      if (condition.kind) assert.match(condition.kind, /^SHOP_SALE_CONDITION_/);
    assert.deepEqual(
      records.get(goodsId),
      {
        goodsId,
        groupId,
        itemId,
        amount: tables.uint(row, 10),
        currency,
        rawTier: tables.string(tier, 2),
        tierSource: tier ? fieldSource(tier, [0, 1, 2]) : null,
        numericCandidates: [6, 7, 8, 9, 12, 13, 21, 22].map((field) => ({
          field,
          nativeValue: tables.uint(row, field),
        })),
        outcomes,
        conditions,
        source: fieldSource(row, [0, 1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18, 21, 22, 23, 24]),
      },
      `Frozen goods diagnostic ${goodsId}`,
    );
  }
  assert.deepEqual(
    diagnostics.emptyGroups,
    [...groups.keys()].filter((id) => !goodsGroups.has(id)).sort((left, right) => left - right),
    "Frozen empty goods groups",
  );
  const giftRows = tables.rows(672);
  assert.equal(diagnostics.giftRows.length, giftRows.length, "Frozen gift coverage");
  for (const [index, row] of giftRows.entries()) {
    const goodsId = tables.id(row);
    const itemId = tables.uint(row, 1);
    const amount = tables.uint(row, 4);
    const currency = tables.uint(row, 5);
    const identity = currencyIdentity(currency);
    const reasons = [];
    if (!itemId) reasons.push("delivered_item_missing");
    if (!identity) reasons.push("currency_unconfirmed");
    if (amount === null) reasons.push("amount_missing");
    if (!reasons.length) {
      reasons.push("admitted");
      check(
        {
          id: `giftGallery:${goodsId}:${itemId}`,
          shopId: "giftGallery",
          deliveredItemId: itemId!,
          currencyItemId: currency!,
          price: { kind: "fixed", amount: amount! },
        },
        {
          shopId: [fieldSource(row, [0, 1, 5]), textSource(tables, 1415967509, "万礼馆")],
          deliveredItemId: [fieldSource(row, [0, 1])],
          price: [fieldSource(row, [0, 4])],
          currencyItemId: [fieldSource(row, [0, 5]), ...identity!],
        },
      );
    }
    assert.deepEqual(
      diagnostics.giftRows[index],
      {
        goodsId,
        itemId,
        amount,
        currency,
        reasons,
        numericCandidates: [2, 3, 6].map((field) => ({
          field,
          nativeValue: tables.uint(row, field),
        })),
        source: fieldSource(row, [0, 1, 2, 3, 4, 5, 6]),
      },
      `Frozen gift diagnostic ${goodsId}:${itemId}`,
    );
  }
  assert.equal(remaining.size, 0, "Unexpected purchase records");
  assert.deepEqual(
    diagnostics.recycleCandidates,
    tables
      .rows(325)
      .filter((row) => tables.uint(row, 14) !== null)
      .map((row) => ({
        itemId: tables.id(row),
        amountCandidate: tables.uint(row, 14),
        relatedAmount: tables.uint(row, 13),
        reason: "sale_payment_and_unit_unconfirmed",
        source: fieldSource(row, [0, 13, 14]),
      })),
    "Frozen recycle candidates",
  );
  if (dataRevision === 1449213) checkSnapshot1449213(catalog, diagnostics);
}
