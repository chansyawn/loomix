import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import { assetsFixture, fixtureContext, fixtureSource } from "./collection-fixture";
import { toCollectionView } from "./collection-view";

test("catalog entries control listing while reference entities remain available to relationships", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  const base = { name: "材料", image: null, quality: null, description: null };
  catalog.items.push(
    {
      ...base,
      id: 1,
      type: "material",
      subcategory: null,
      trade: null,
      acquisition: null,
      sources: ["来源甲，保留原文", "来源乙"],
    },
    { ...base, id: 2, type: "reference" },
  );
  catalog.entries.push({ entity: { kind: "item", id: 1 }, encyclopedia: null });
  const view = toCollectionView(catalog, assetsFixture(catalog));
  expect(view.miscellaneous.map((item) => item.id)).toEqual([1]);
  expect(view.ingredientItemsById.get(2)).toMatchObject({ listed: false });
});

test("external appearance records retain their identity without entering item lists", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  catalog.appearances.push({
    id: 8,
    name: "发型",
    subcategory: "发型",
    image: null,
    quality: null,
    description: null,
  });
  catalog.entries.push({ entity: { kind: "appearance", id: 8 }, encyclopedia: { listed: false } });
  expect(toCollectionView(catalog, assetsFixture(catalog)).clothing.appearances[0].id).toBe(8);
});

test("creature details retain scientific names and localized acquisition labels", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  catalog.items.push({
    id: 1,
    name: "三色锦鲤",
    type: "creature",
    subcategory: "水生生物",
    image: null,
    description: null,
    quality: 2,
    trade: null,
    acquisition: null,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    sizeRange: null,
    scientificName: "Cyprinus carpio",
    sources: ["钓鱼", "河域钓取"],
    research: null,
    size: null,
    grades: null,
  });
  catalog.entries.push({ entity: { kind: "item", id: 1 }, encyclopedia: { listed: true } });

  expect(toCollectionView(catalog, assetsFixture(catalog)).creatures.items[0]).toMatchObject({
    scientificName: "Cyprinus carpio",
    sources: "钓鱼，河域钓取",
  });
});
