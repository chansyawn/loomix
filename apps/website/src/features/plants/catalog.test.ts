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
      seeds: [plantSeedFixture({ id: 30, plantIds: [1] })],
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
  const plant = catalog.records[0];
  if (plant.type !== "plant") throw new Error("Expected plant");
  catalog.gameplayTags.push(
    { id: 1001, name: "禾夏，星系", displayName: "禾夏，星系", enumName: null, parentId: null },
    { id: 1002, name: "帕沙", displayName: "帕沙", enumName: null, parentId: null },
  );
  plant.gameplayTagGroups.find((group) => group.field === 8)!.tagIds = [1001, 1002];
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
test("derives every seed for a plant from stage references without duplicate product fields", () => {
  const catalog = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1 })],
      series: [],
      seeds: [plantSeedFixture({ id: 10 }), plantSeedFixture({ id: 11 })],
    }),
  });
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  expect(data.items[0].summary.seeds.map((seed) => seed.id)).toEqual([10, 11]);
  expect(data.items[0].summary.growths).toHaveLength(2);
  expect(data.seeds[0].growth.kind).toBe("staged");
  expect(catalog.records.find((record) => record.type === "seed")).not.toHaveProperty("productIds");
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
  catalog.records = catalog.records.filter((record) => record.id !== 3);
  catalog.references.push({ id: 3, name: "树胶" });
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  const groups = data.series[0].summary.drops.groups;
  expect(groups.map((group) => group.treeId)).toEqual([2, 1]);
  expect(groups.map((group) => group.entries[0].probability)).toEqual([25 / 957, 0.025]);
  expect(groups[0].entries[0].item).toMatchObject({ id: 3, name: "树胶", listed: false });
  expect(groups[1].entries[1]).toMatchObject({ itemId: 4, probability: null, dropGroupId: null });
  expect(data.sourceTreesByItemId.get(3)?.map((item) => item.id)).toEqual([1, 2]);
});

test("flower and tree stage mappings include formal intermediate shrubs without linking fruit as a seed product", () => {
  const tree = plantSeedFixture({
    id: 20,
    plantIds: [1],
    growth: {
      id: 20,
      kind: "staged",
      maturityDays: null,
      stages: [
        { id: 10, name: "苗", image: null, plantId: null },
        { id: 1, name: "树", image: null, plantId: 1 },
        { id: 11, name: "后续形态", image: null, plantId: null },
      ],
    },
  });
  const flower = plantSeedFixture({ id: 21, plantIds: [3] });
  const catalog = catalogFixture({
    plants: plantsDataFixture({
      items: [
        plantItemFixture({
          id: 1,
          treeDrops: [
            {
              itemId: 2,
              dropGroupId: null,
              weight: null,
              quantityMin: null,
              quantityMax: null,
              probability: null,
            },
          ],
        }),
        plantItemFixture({ id: 2 }),
        plantItemFixture({ id: 3 }),
      ],
      series: [plantSeriesFixture({ id: 100, plantIds: [1, 3] })],
      seeds: [tree, flower],
    }),
  });
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  expect(data.items[0].summary.seeds.map((seed) => seed.id)).toEqual([20]);
  expect(data.items[1].summary.seeds).toEqual([]);
  expect(data.items[2].summary.seeds.map((seed) => seed.id)).toEqual([21]);
  expect(data.series[0].summary.growths).toHaveLength(2);
  expect(data.items[0].summary.growths[0].growth.stages.at(-1)?.id).toBe(11);
});
