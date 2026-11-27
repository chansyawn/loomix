import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import type { PurchaseOffer } from "@loomix/schema/catalog";
import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import {
  imageIndexFixture,
  fixtureContext,
  fixtureSource,
  addFixtureRecords,
} from "./omnidex-fixture";
import { toOmnidexView } from "./omnidex-view";

test("catalog entries control listing while reference entities remain available to relationships", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  const base = { name: "材料", image: null, quality: null, description: null };
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      ...base,
      id: 1,
      kind: "material",
      category: null,
    },
    { ...base, id: 2, kind: "reference" },
  );
  const view = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(view.miscellaneous.map((item) => item.id)).toEqual([1]);
  expect(view.ingredientItemsById.get(2)).toMatchObject({ browsable: false });
});

test("external appearance records retain their identity without entering item lists", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    kind: "appearance",
    id: 8,
    name: "发型",
    category: "发型",
    image: null,
    quality: null,
    description: null,
  });
  expect(
    toOmnidexView(catalog, imageIndexFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .clothing.appearances[0].id,
  ).toBe(8);
});

test("有图和缺图的友邻服饰均进入专属列表", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  const file = `assets/${"a".repeat(64)}.webp`;
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      id: 9,
      name: "丰年连衣裙",
      kind: "neighborOutfit",
      category: "连衣裙",
      image: null,
      quality: 1,
      neighborId: 1010,
      bodyTypes: ["medium", "big"],
    },
    {
      id: 10,
      name: "丰年手套",
      kind: "neighborOutfit",
      category: "手套",
      image: { assetId: file, variant: "icon" },
      bodyTypes: ["small"],
    },
  );
  addFixtureRecords(catalog, gameplayTags, { kind: "reference", id: 200014, name: "友邻服饰币" });
  catalog.shops.push({
    id: "neighborWardrobe",
    name: "友邻衣橱",
    paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
  });
  const freeOffer: PurchaseOffer = {
    id: "neighborWardrobe:50",
    shopId: "neighborWardrobe",
    deliveredItemId: 10,
    currencyItemId: 200014,
    price: { kind: "fixed", amount: 0 },
    note: "任务/限时货架",
  };
  catalog.purchaseOffers.push(
    freeOffer,
    { ...freeOffer, id: "neighborWardrobe:51" },
    { ...freeOffer, id: "neighborWardrobe:52", price: { kind: "fixed", amount: 20 } },
  );
  const view = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(view.clothing.items).toEqual([]);
  expect(view.clothing.appearances).toEqual([]);
  expect(view.clothing.neighborOutfit).toMatchObject([
    {
      id: 9,
      name: "丰年连衣裙",
      image: null,
      category: "连衣裙",
      quality: 1,
      bodyTypes: ["medium", "big"],
      priceLabel: null,
    },
    {
      id: 10,
      name: "丰年手套",
      image: file,
      category: "手套",
      bodyTypes: ["small"],
      priceLabel: "0 友邻服饰币 / 20 友邻服饰币",
    },
  ]);
  expect(view.ingredientItemsById.get(9)).toMatchObject({
    catalogCategory: "neighborOutfit",
    browsable: false,
  });
});

test("creature details retain scientific names", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    id: 1,
    name: "三色锦鲤",
    kind: "creature",
    category: "水生生物",
    image: null,
    description: null,
    quality: 2,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    sizeRange: null,
    scientificName: "Cyprinus carpio",
    size: null,
    grades: null,
  });

  expect(
    toOmnidexView(catalog, imageIndexFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .creatures.items[0],
  ).toMatchObject({
    scientificName: "Cyprinus carpio",
  });
});

test("dish details retain tastes, structured effects and unlock requirements", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    id: 1,
    name: "星露烤鱼",
    kind: "dish",
    category: null,
    image: null,
    description: null,
    quality: 2,
    galaxyFlavor: "禾夏风味",
    strength: 40,
    effects: [
      {
        effectId: 1000201,
        name: "大力播洒 一阶",
        description: "浇水或施肥范围提升",
        level: 1,
        uses: null,
        durationSeconds: 10,
      },
    ],
    cooking: {
      difficulty: "招牌",
      cookware: "烤箱",
      tastes: ["甜", "咸"],
      slots: [],
      unlockCondition: { kind: "chefLevelGreaterOrEqual", level: 5 },
    },
  });

  expect(
    toOmnidexView(catalog, imageIndexFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .dishes.items[0],
  ).toMatchObject({
    strength: 40,
    effects: [{ name: "大力播洒 一阶", durationSeconds: 10 }],
    tastes: ["甜", "咸"],
    cookware: "烤箱",
    unlockCondition: { kind: "chefLevelGreaterOrEqual", level: 5 },
  });
});
