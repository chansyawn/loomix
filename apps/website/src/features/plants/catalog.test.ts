import { expect, test } from "vite-plus/test";
import { assetsFixture, catalogFixture } from "../collection-fixture";
import { toCollectionView } from "../collection-view";
import { plantItemFixture, plantSeriesFixture, plantsDataFixture } from "./fixture";

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
  plant.sources = ["采集，限时活动"];
  const data = toCollectionView(catalog, assetsFixture(catalog)).plants;
  expect(data.series[0].summary.galaxies).toEqual(["禾夏，星系", "帕沙"]);
  expect(data.series[0].summary.sources).toEqual(["采集，限时活动"]);
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
