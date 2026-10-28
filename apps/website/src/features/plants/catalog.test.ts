import { describe, expect, it } from "vite-plus/test";
import {
  emptyCollectionDetail,
  emptyCropSeedDetail,
  parseCatalogV5,
} from "@loomix/content-schema/v5";
import type { CatalogV5 } from "@loomix/content-schema/v5";
import { toCollectionView } from "../collection-view";
import { catalogFixture } from "../collection-fixture";
import { plantItemFixture, plantSeriesFixture, plantsDataFixture } from "./fixture";
import { plantSeriesImage } from "./catalog";
import { plantsDetail } from "./detail";
import type { PlantGrowth } from "./model";

const smallImage = `assets/${"a".repeat(64)}.webp`;
const normalImage = `assets/${"b".repeat(64)}.webp`;
const growth: PlantGrowth = {
  cycleMode: "CROP_PLANT_CROW_CYCLE_DAILY",
  stageIds: [101, 102],
  regrowthStageIds: [102],
  stages: [
    { id: 101, name: "幼苗", image: smallImage },
    { id: 102, name: "生长期", image: normalImage },
    { id: 103, name: "瘦小植株", image: smallImage },
    { id: 104, name: "普通植株", image: normalImage },
    { id: 105, name: "枯萎植株", image: null },
  ],
  matureStages: [
    { entityId: 103, productId: 1, tag: "CROP_TAG_SMALL", rank: "CROP_RANK_INFERIOR" },
    { entityId: 104, productId: 2, tag: "CROP_TAG_NORMAL", rank: "CROP_RANK_NORMAL" },
  ],
  witheredStageId: 105,
  maturityDays: null,
  harvestCount: 3,
};

function fixture(): CatalogV5 {
  const plants = plantsDataFixture({
    items: [
      plantItemFixture({
        id: 1,
        name: "瘦小番茄",
        image: smallImage,
        category: "作物",
        sources: "种植",
        seedId: 20,
        harvestCount: 3,
      }),
      plantItemFixture({
        id: 2,
        name: "番茄",
        image: normalImage,
        category: "作物",
        sources: "种植",
        seedId: 20,
        harvestCount: 3,
      }),
      plantItemFixture({ id: 3, name: "苹果树", category: "环境植物", sources: "种植" }),
      plantItemFixture({ id: 4, name: "苹果", category: "采摘材料" }),
      plantItemFixture({
        id: 5,
        name: "白百合",
        image: smallImage,
        category: "花",
        sources: "采集，花卉杂交",
        flowerColors: ["白色", "白色"],
      }),
    ],
    series: [
      plantSeriesFixture({ id: 30, name: "番茄", plantIds: [1, 2] }),
      plantSeriesFixture({ id: 31, name: "百合", plantIds: [5] }),
      plantSeriesFixture({ id: 32, name: "未知", plantIds: null }),
      plantSeriesFixture({ id: 33, name: "空", plantIds: [] }),
    ],
  });
  const catalog = catalogFixture({
    plants,
    miscellaneous: [{ id: 10, name: "木材", image: null, description: null, quality: null }],
  });
  catalog.cropSeeds = [
    {
      id: 20,
      name: "番茄种子",
      image: normalImage,
      productIds: [1, 2],
      detail: {
        ...emptyCropSeedDetail(20),
        description: "种出番茄",
        stageIds: [101, 102],
        harvestCount: 3,
        growth,
      },
    },
  ];
  catalog.details = catalog.details.map((detail) => {
    if (detail.id === 1 || detail.id === 2) return { ...detail, growth };
    if (detail.id === 3)
      return {
        ...detail,
        treeDrops: [4, 10, 999, 999].map((itemId) => ({
          itemId,
          dropGroupId: null,
          weight: null,
          quantityMin: null,
          quantityMax: null,
          probability: null,
        })),
      };
    return detail;
  });
  return parseCatalogV5(catalog);
}

describe("plant catalog enrichment", () => {
  it("selects the normal crop image and shares it across list and detail data", () => {
    const catalog = fixture();
    const before = structuredClone(catalog);
    const plants = toCollectionView(catalog).plants;
    expect(plants.series[0]).toMatchObject({ image: normalImage, plantIds: [1, 2] });
    expect(plantsDetail(plants, "series", 30).record.image).toBe(normalImage);
    expect(plants.series[1]?.image).toBe(smallImage);
    expect(plants.series.slice(2).map((series) => series.image)).toEqual([null, null]);
    expect(catalog).toEqual(before);
  });

  it("falls back to a same-name member, then the first pictured member", () => {
    const first = plantItemFixture({ id: 1, name: "粉花", image: smallImage });
    const named = plantItemFixture({ id: 2, name: "花", image: normalImage });
    expect(plantSeriesImage("花", [first, named])).toBe(normalImage);
    expect(plantSeriesImage("其他花", [first, named])).toBe(smallImage);
    expect(plantSeriesImage("花", [{ ...named, image: null }, first])).toBe(smallImage);
    expect(plantSeriesImage("花", [])).toBeNull();
  });

  it("deduplicates seed growth and sources while preserving stage order and unknown days", () => {
    const plants = toCollectionView(fixture()).plants;
    const summary = plants.series[0]!.summary;
    expect(summary.seeds.map((seed) => seed.id)).toEqual([20]);
    expect(summary.growths).toEqual([{ id: 20, name: "番茄种子", growth }]);
    expect(summary.sources).toEqual(["种植"]);
    expect(summary.harvestCounts).toEqual([3]);
    expect(summary.growths[0]?.growth.stageIds).toEqual([101, 102]);
    expect(summary.growths[0]?.growth.maturityDays).toBeNull();
    expect(plants.series[1]?.summary.flowerColors).toEqual(["白色"]);
    expect(plants.series[1]?.summary.sources).toEqual(["采集", "花卉杂交"]);
    expect(plants.series[1]?.summary.growths).toEqual([]);
  });

  it("keeps distinct seeds when a series has multiple seed associations", () => {
    const catalog = fixture();
    const second = catalog.items.find((item) => item.id === 2);
    if (!second || second.kind !== "item" || second.category !== "plants")
      throw new Error("Missing fixture plant");
    second.seedId = 21;
    catalog.cropSeeds[0]!.productIds = [1];
    catalog.cropSeeds.push({
      ...catalog.cropSeeds[0]!,
      id: 21,
      name: "另一种子",
      productIds: [2],
      detail: { ...catalog.cropSeeds[0]!.detail, id: 21 },
    });
    const plants = toCollectionView(parseCatalogV5(catalog)).plants;
    expect(plants.series[0]?.summary.seeds.map((seed) => seed.id)).toEqual([20, 21]);
    expect(plants.series[0]?.summary.growths.map((group) => group.id)).toEqual([20, 21]);
  });

  it("resolves cross-category drops, counts unknown items once and indexes source trees", () => {
    const plants = toCollectionView(fixture()).plants;
    const tree = plants.items.find((item) => item.id === 3)!;
    expect(tree.summary.drops).toMatchObject({
      items: [
        { id: 4, catalogCategory: "plants" },
        { id: 10, catalogCategory: "miscellaneous" },
      ],
      unlistedCount: 1,
    });
    expect(plants.sourceTreesByItemId.get(4)?.map((item) => item.id)).toEqual([3]);
    expect(plants.sourceTreesByItemId.get(999)?.map((item) => item.id)).toEqual([3]);
    expect(plantsDetail(plants, "items", 4)).toMatchObject({ sourceTrees: [{ id: 3 }] });
  });

  it("excludes the current plant from related members and supports standalone plants", () => {
    const plants = toCollectionView(fixture()).plants;
    const detail = plantsDetail(plants, "items", 1);
    if (detail.kind !== "item") throw new Error("Expected item detail");
    expect(detail.relatedGroups.map((group) => group.items.map((item) => item.id))).toEqual([[2]]);
    expect(plantsDetail(plants, "items", 3)).toMatchObject({ series: [], relatedGroups: [] });
    expect(plantsDetail(plants, "series", 32)).toMatchObject({ items: null });
    expect(plantsDetail(plants, "series", 33)).toMatchObject({ items: [] });
  });

  it("retains available growth even when the associated seed has no growth detail", () => {
    const catalog = fixture();
    catalog.cropSeeds[0]!.detail.growth = null;
    const plants = toCollectionView(catalog).plants;
    expect(plants.items[0]?.summary.growths[0]?.growth).toEqual(growth);
    expect(plants.series[0]?.summary.growths).toHaveLength(1);
  });

  it("uses confirmed acquisition labels when the legacy source string is absent", () => {
    const catalog = fixture();
    const item = catalog.items.find((record) => record.id === 4);
    if (!item || item.kind !== "item" || item.category !== "plants")
      throw new Error("Missing fixture plant");
    catalog.details = catalog.details.map((detail) =>
      detail.id === 4
        ? {
            ...emptyCollectionDetail(4),
            acquisitionConditions: [{ sourceId: 1, label: "摇晃果树", condition: null }],
          }
        : detail,
    );
    expect(
      toCollectionView(catalog).plants.items.find((plant) => plant.id === 4)?.summary.sources,
    ).toEqual(["摇晃果树"]);
  });
});
