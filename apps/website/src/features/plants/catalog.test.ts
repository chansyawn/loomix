import { expect, test } from "vite-plus/test";
import { assetsFixture, catalogFixture } from "../collection-fixture";
import { toCollectionView } from "../collection-view";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "./fixture";
import { filterGroups, queryPlants } from "./query";
import { emptyQuery } from "./search";

test("derives crop detail destinations for seeds, products and shared ingredient references", () => {
  const catalog = catalogFixture({
    plants: plantsDataFixture({
      items: [
        plantItemFixture({ id: 1, category: "作物" }),
        plantItemFixture({ id: 2, category: "花" }),
      ],
      series: [
        plantSeriesFixture({ id: 10, plantIds: [1] }),
        plantSeriesFixture({ id: 20, plantIds: [2] }),
      ],
      seeds: [plantSeedFixture({ id: 30, productIds: [1] })],
    }),
  });
  const view = toCollectionView(catalog, assetsFixture(catalog));
  expect(view.plants.items.map((item) => item.cropSeriesId)).toEqual([10, null]);
  expect(view.plants.seeds[0].cropSeriesId).toBe(10);
  expect(view.plants.series[0].summary.seeds[0].cropSeriesId).toBe(10);
  expect(view.ingredientItemsById.get(1)?.cropSeriesId).toBe(10);
  expect(view.ingredientItemsById.get(2)?.cropSeriesId).toBeNull();
});

test("summarizes structured origins without parsing punctuation in localized labels", () => {
  const catalog = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1, name: "植物", category: "作物" })],
      series: [plantSeriesFixture({ id: 2, plantIds: [1] })],
    }),
  });
  const plant = catalog.items[0];
  if (plant.type !== "plant") throw new Error("Expected plant");
  plant.origins = ["禾夏，星系", "帕沙"];
  plant.acquisition = [{ sourceId: 1, label: "采集，限时活动", condition: null }];
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  expect(data.series[0].summary.galaxies).toEqual(["禾夏，星系", "帕沙"]);
  expect(data.series[0].summary.acquisition).toEqual(["采集，限时活动"]);
  expect(filterGroups(data).find((group) => group.key === "acquisition")?.options).toEqual([
    { value: "采集，限时活动", label: "采集，限时活动" },
  ]);
  expect(
    queryPlants(data, "items", { ...emptyQuery(), acquisition: ["采集，限时活动"] }).total,
  ).toBe(1);
  expect(queryPlants(data, "items", { ...emptyQuery(), acquisition: ["采集"] }).total).toBe(0);
});
test("keeps multiple seeds for a product and shares one growth configuration", () => {
  const catalog = catalogFixture({
    plants: plantsDataFixture({ items: [plantItemFixture({ id: 1 })], series: [] }),
  });
  catalog.growths.push({
    id: 9,
    cycleMode: null,
    stageIds: [],
    regrowthStageIds: [],
    stages: [],
    matureStages: [],
    witheredStageId: null,
    maturityDays: null,
    harvestCount: 3,
  });
  const plant = catalog.items[0];
  if (plant.type !== "plant") throw new Error("Expected plant");
  plant.growthId = 9;
  for (const id of [10, 11])
    catalog.seeds.push({
      id,
      name: `种子${id}`,
      description: null,
      quality: null,
      image: null,
      productIds: [1],
      growthId: 9,
      trade: null,
      acquisition: null,
    });
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  const item = data.items[0];
  expect(item.summary.seeds.map((seed) => seed.id)).toEqual([10, 11]);
  expect(item.summary.growths).toHaveLength(1);
  expect(data.seeds.map((seed) => seed.id)).toEqual([10, 11]);
  expect(data.seeds[0].detail.harvestCount).toBe(3);
});

test("掉落保留来源树种、概率和果实，不合并系列成员的概率", () => {
  const drop = {
    itemId: 3,
    dropGroupId: 40000,
    weight: 25,
    quantityMin: null,
    quantityMax: null,
    probability: 0.025,
  };
  const catalog = catalogFixture({
    plants: plantsDataFixture({
      items: [
        plantItemFixture({
          id: 1,
          name: "苹果树",
          treeDrops: [
            drop,
            { ...drop, itemId: 4, dropGroupId: null, weight: null, probability: null },
          ],
        }),
        plantItemFixture({
          id: 2,
          name: "花树",
          treeDrops: [{ ...drop, dropGroupId: 40007, probability: 25 / 957 }],
        }),
        plantItemFixture({ id: 3, name: "树胶" }),
        plantItemFixture({ id: 4, name: "果实" }),
      ],
      series: [plantSeriesFixture({ id: 10, plantIds: [2, 1] })],
    }),
  });
  catalog.entries = catalog.entries.filter((entry) => entry.entity.id !== 3);
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  const groups = data.series[0].summary.drops.groups;
  expect(groups.map((group) => group.treeId)).toEqual([2, 1]);
  expect(groups.map((group) => group.entries[0].probability)).toEqual([25 / 957, 0.025]);
  expect(groups[0].entries[0].item).toMatchObject({ id: 3, name: "树胶", listed: false });
  expect(groups[1].entries[1]).toMatchObject({ itemId: 4, probability: null, dropGroupId: null });
  expect(data.sourceTreesByItemId.get(3)?.map((item) => item.id)).toEqual([1, 2]);
});
