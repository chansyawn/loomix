import { expect, test } from "vite-plus/test";
import { parseCatalog, PurchasePriceSchema, type Catalog } from "../src/catalog/index.ts";
import { reference } from "./fixture.ts";

const catalog: Catalog = {
  items: [1, 2, 3].map((id) => reference(id)),
  collections: [],
  inspoBoxes: [],
  shops: [
    {
      id: "neighborWardrobe",
      name: "友邻衣橱",
      paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
    },
  ],
  purchaseOffers: [
    {
      id: "neighborWardrobe:1",
      shopId: "neighborWardrobe",
      deliveredItemId: 1,
      currencyItemId: 2,
      price: { kind: "fixed", amount: 0 },
    },
  ],
};

test("购买报价的商品身份唯一，商店、交付物与货币须可解析", () => {
  expect(parseCatalog(catalog)).toEqual(catalog);
  const offer = catalog.purchaseOffers[0]!;
  expect(() => parseCatalog({ ...catalog, purchaseOffers: [offer, offer] })).toThrow(
    "Duplicate identity",
  );
  expect(() => parseCatalog({ ...catalog, shops: [] })).toThrow("Unknown shop");
  for (const id of [1, 2])
    expect(() =>
      parseCatalog({ ...catalog, items: catalog.items.filter((item) => item.id !== id) }),
    ).toThrow();
});

test("报价和商店说明都可省略，写入时须有文字", () => {
  const shop = { id: "neighborWardrobe", name: "友邻衣橱" };
  const offer = catalog.purchaseOffers[0]!;
  expect(parseCatalog({ ...catalog, shops: [shop] }).shops).toEqual([shop]);
  expect(() => parseCatalog({ ...catalog, shops: [{ ...shop, paymentNote: " " }] })).toThrow();
  expect(() => parseCatalog({ ...catalog, purchaseOffers: [{ ...offer, note: " " }] })).toThrow();
});

test("每日次数价保留明确的零，次数严格递增，金额和次数都是非负安全整数", () => {
  const daily = (counts: number[], amount = 0) => ({
    kind: "dailyPurchaseCount",
    entries: counts.map((purchasedToday) => ({ purchasedToday, amount })),
  });
  expect(PurchasePriceSchema.parse(daily([0, 2]))).toEqual(daily([0, 2]));
  for (const price of [
    daily([]),
    daily([0, 0]),
    daily([2, 1]),
    daily([-1]),
    daily([0.5]),
    daily([0], -1),
    daily([0], Number.MAX_SAFE_INTEGER + 1),
    { kind: "fixed", amount: null },
    { kind: "fixed", amount: 1.5 },
  ])
    expect(PurchasePriceSchema.safeParse(price).success).toBe(false);
});
