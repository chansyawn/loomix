import { createImageResolver } from "@loomix/schema/assets";
import type { PurchaseOffer } from "@loomix/schema/catalog";
import { expect, test } from "vite-plus/test";
import { addFixtureRecords, catalogFixture, imageIndexFixture } from "../omnidex-fixture";
import { indexPurchaseQuotes, purchasePriceSummary, simplePurchaseQuote } from "./purchase-quotes";

test("同店同物同币种的同价只展示一次，异价、跨店和同名异币种分别保留", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "furniture", id: 1, name: "简约饮水器" },
    {
      kind: "reference",
      id: 200002,
      name: "碎钱",
      image: { assetId: "coin.webp", variant: "icon" },
    },
    {
      kind: "material",
      id: 200012,
      name: "碎钱",
      image: { assetId: "other-coin.webp", variant: "icon" },
    },
  );
  catalog.shops.push(
    { id: "gelian", name: "格连" },
    {
      id: "neighborWardrobe",
      name: "友邻衣橱",
      paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
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
    { ...offer, id: "gelian:3", price: { kind: "fixed", amount: 360 }, note: "任务/限时货架" },
    { ...offer, id: "gelian:4", currencyItemId: 200012 },
    { ...offer, id: "neighborWardrobe:1", shopId: "neighborWardrobe" },
  );
  const quotes = indexPurchaseQuotes(catalog, createImageResolver(imageIndexFixture(catalog))).get(
    1,
  );
  expect(quotes).toMatchObject([
    {
      id: "gelian",
      prices: [
        { priceLabel: "290 碎钱", currencyImage: "coin.webp", note: null },
        { priceLabel: "360 碎钱", currencyImage: "coin.webp", note: "任务/限时货架" },
        { priceLabel: "290 碎钱", currencyImage: "other-coin.webp", note: null },
      ],
    },
    {
      id: "neighborWardrobe",
      paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
      prices: [{ priceLabel: "290 碎钱", currencyImage: "coin.webp", note: null }],
    },
  ]);
  expect(purchasePriceSummary(quotes)).toBe(
    "格连 290 碎钱 / 格连 360 碎钱 / 格连 290 碎钱 / 友邻衣橱 290 碎钱",
  );
});

test.each([false, true])("同价只显示一次短注，有未注来源时省略（反向读取 %s）", (reverse) => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "furniture", id: 1, name: "粉白陶瓷杯" },
    { kind: "furniture", id: 2, name: "花叶拼布沙发椅" },
    { kind: "reference", id: 200002, name: "碎钱" },
  );
  catalog.shops.push({ id: "gelian", name: "格连" });
  const cup: PurchaseOffer = {
    id: "gelian:1",
    shopId: "gelian",
    deliveredItemId: 1,
    currencyItemId: 200002,
    price: { kind: "fixed", amount: 150 },
    note: "任务/限时货架",
  };
  const chair: PurchaseOffer = {
    ...cup,
    id: "gelian:4",
    deliveredItemId: 2,
    price: { kind: "fixed", amount: 460 },
    note: undefined,
  };
  catalog.purchaseOffers.push(cup, { ...cup, id: "gelian:2" }, { ...cup, id: "gelian:3" }, chair, {
    ...chair,
    id: "gelian:5",
    note: cup.note,
  });
  if (reverse) catalog.purchaseOffers.reverse();
  const quotes = indexPurchaseQuotes(catalog, createImageResolver(imageIndexFixture(catalog)));
  expect(quotes.get(1)).toMatchObject([
    { prices: [{ priceLabel: "150 碎钱", note: "任务/限时货架", currencyImage: null }] },
  ]);
  expect(quotes.get(2)).toMatchObject([{ prices: [{ priceLabel: "460 碎钱", note: null }] }]);
  expect(purchasePriceSummary(quotes.get(1))).toBe("150 碎钱");
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
    { id: "luomiTv", name: "络米电视购" },
    { id: "starryMarket", name: "星空街市" },
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
  const quotes = indexPurchaseQuotes(catalog, createImageResolver(imageIndexFixture(catalog)));
  expect(quotes.get(1)?.[0].prices.map((quote) => quote.priceLabel)).toEqual([
    "当日第 1 次 100 足迹，当日第 2 次 200 足迹，当日第 3 次 200 足迹",
    "当日第 1 次 100 足迹，当日第 3 次 200 足迹",
  ]);
  expect(quotes.get(2)?.[0].prices.map((quote) => quote.priceLabel)).toEqual([
    "当日第 1 次 0 街乐果冻",
    "0 街乐果冻",
  ]);
  expect(quotes.get(200006)).toBeUndefined();
  expect(simplePurchaseQuote(quotes.get(1))).toBeNull();
});

test("顶部报价仅接受单条无备注的固定配置，保留零价和同名货币身份", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "material", id: 1, name: "木料" },
    { kind: "reference", id: 2, name: "碎钱" },
  );
  catalog.shops.push({ id: "gelian", name: "格连" });
  const offer: PurchaseOffer = {
    id: "gelian:1",
    shopId: "gelian",
    deliveredItemId: 1,
    currencyItemId: 2,
    price: { kind: "fixed", amount: 0 },
  };
  catalog.purchaseOffers.push(offer);
  const summary = () => simplePurchaseQuote(indexPurchaseQuotes(catalog, () => null).get(1));
  expect(summary()).toBe("格连 · 0 碎钱");
  offer.note = "任务货架";
  expect(summary()).toBeNull();
  delete offer.note;
  catalog.shops[0].paymentNote = "特殊支付规则";
  expect(summary()).toBeNull();
  delete catalog.shops[0].paymentNote;
  offer.price = { kind: "dailyPurchaseCount", entries: [{ purchasedToday: 0, amount: 0 }] };
  expect(summary()).toBeNull();
});
