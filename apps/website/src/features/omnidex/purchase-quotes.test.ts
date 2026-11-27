import type { PurchaseOffer } from "@loomix/schema/catalog";
import { expect, test } from "vite-plus/test";
import { addFixtureRecords, catalogFixture } from "../omnidex-fixture";
import { indexPurchaseQuotes, purchasePriceSummary } from "./purchase-quotes";

test("同店同物同币种的同价只展示一次，异价、跨店和同名异币种分别保留", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "furniture", id: 1, name: "简约饮水器" },
    { kind: "reference", id: 200002, name: "碎钱" },
    { kind: "reference", id: 200012, name: "碎钱" },
    { kind: "reference", id: 200014, name: "友邻服饰币" },
  );
  catalog.shops.push(
    { id: "gelian", name: "格连", shortfallPayment: null },
    {
      id: "neighborWardrobe",
      name: "友邻衣橱",
      shortfallPayment: {
        kind: "oneToOne",
        primaryCurrencyItemId: 200014,
        substituteCurrencyItemId: 200002,
      },
    },
  );
  const offer: PurchaseOffer = {
    id: "gelian:1",
    shopId: "gelian",
    deliveredItemId: 1,
    currencyItemId: 200002,
    price: { kind: "fixed", amount: 290 },
  };
  catalog.purchaseOffers.push(
    offer,
    { ...offer, id: "gelian:2" },
    { ...offer, id: "gelian:3", price: { kind: "fixed", amount: 360 } },
    { ...offer, id: "gelian:4", currencyItemId: 200012 },
    { ...offer, id: "neighborWardrobe:1", shopId: "neighborWardrobe" },
  );
  const quotes = indexPurchaseQuotes(catalog).get(1);
  expect(quotes?.map(({ id, priceLabel, shortfall }) => [id, priceLabel, shortfall])).toEqual([
    ["gelian:1", "290 碎钱", null],
    ["gelian:3", "360 碎钱", null],
    ["gelian:4", "290 碎钱", null],
    ["neighborWardrobe:1", "290 碎钱", null],
  ]);
  expect(purchasePriceSummary(quotes)).toBe(
    "格连 290 碎钱 / 格连 360 碎钱 / 格连 290 碎钱 / 友邻衣橱 290 碎钱",
  );
});

test("次数价按明确的购买次数展示，保留重复金额、零价和档位缺口", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "material", id: 1, name: "星锚" },
    { kind: "material", id: 2, name: "礼帽魔术券" },
    { kind: "reference", id: 200003, name: "足迹" },
    { kind: "reference", id: 200006, name: "街乐果冻" },
  );
  catalog.shops.push(
    { id: "luomiTv", name: "络米电视购", shortfallPayment: null },
    { id: "starryMarket", name: "星空街市", shortfallPayment: null },
  );
  const anchor: PurchaseOffer = {
    id: "luomiTv:2",
    shopId: "luomiTv",
    deliveredItemId: 1,
    currencyItemId: 200003,
    price: {
      kind: "dailyPurchaseCount",
      entries: [
        { purchasedToday: 0, amount: 100 },
        { purchasedToday: 1, amount: 200 },
        { purchasedToday: 2, amount: 200 },
      ],
    },
  };
  const ticket: PurchaseOffer = {
    id: "starryMarket:2",
    shopId: "starryMarket",
    deliveredItemId: 2,
    currencyItemId: 200006,
    price: { kind: "dailyPurchaseCount", entries: [{ purchasedToday: 0, amount: 0 }] },
  };
  catalog.purchaseOffers.push(
    anchor,
    { ...anchor, id: "luomiTv:3" },
    {
      ...anchor,
      id: "luomiTv:4",
      price: {
        kind: "dailyPurchaseCount",
        entries: [
          { purchasedToday: 0, amount: 100 },
          { purchasedToday: 2, amount: 200 },
        ],
      },
    },
    ticket,
    { ...ticket, id: "starryMarket:3", price: { kind: "fixed", amount: 0 } },
  );
  const quotes = indexPurchaseQuotes(catalog);
  expect(quotes.get(1)?.map((quote) => quote.priceLabel)).toEqual([
    "当日第 1 次 100 足迹，当日第 2 次 200 足迹，当日第 3 次 200 足迹",
    "当日第 1 次 100 足迹，当日第 3 次 200 足迹",
  ]);
  expect(quotes.get(2)?.map((quote) => quote.priceLabel)).toEqual([
    "当日第 1 次 0 街乐果冻",
    "0 街乐果冻",
  ]);
  expect(quotes.get(200006)).toBeUndefined();
});
