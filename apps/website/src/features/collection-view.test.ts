import { describe, expect, it } from "vite-plus/test";
import { emptyCatalog, parseCatalog } from "@loomix/content-schema";
import type { RecordBase } from "@loomix/content-schema";
import { toCollectionView } from "./collection-view.ts";

const source = { gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 };
const base = (id: number): RecordBase => ({
  id,
  name: `记录${id}`,
  image: null,
  description: null,
  quality: null,
  encyclopediaEntry: { listed: true },
});

describe("collection view adapter", () => {
  it("projects every category and record kind into the existing collection views", () => {
    const catalog = parseCatalog({
      ...emptyCatalog(source),
      items: [
        {
          ...base(1),
          kind: "item",
          category: "furniture",
          subcategory: "基础家具",
          attributes: {
            type: "床",
            size: "1.0x2.0",
            colors: "蓝",
            materials: "木",
            sources: "商店",
          },
        },
        { ...base(2), kind: "set", category: "furniture", memberIds: [1] },
        {
          ...base(3),
          kind: "item",
          category: "creatures",
          subcategory: "鱼",
          attributes: {
            region: "星屿",
            habitat: "河流",
            activeSeasons: "夏",
            activeTimes: "上午",
            activeWeather: "晴",
            sizeRange: null,
          },
        },
        { ...base(4), kind: "series", category: "creatures", memberIds: [3] },
        {
          ...base(5),
          kind: "item",
          category: "plants",
          subcategory: "采摘材料",
          attributes: { originGalaxy: "星屿", maturityPeriod: null, harvestCount: 3 },
        },
        { ...base(6), kind: "series", category: "plants", memberIds: [5] },
        {
          ...base(7),
          kind: "item",
          category: "dishes",
          subcategory: null,
          attributes: {
            difficulty: "简单",
            galaxyFlavor: "星屿",
            cookware: "煮锅",
            effects: "增加力气",
          },
        },
        { ...base(8), kind: "series", category: "dishes", memberIds: [7] },
        {
          ...base(9),
          kind: "item",
          category: "clothing",
          subcategory: "帽子",
          attributes: { colors: "白", materials: "布", styles: "休闲", sources: "商店" },
        },
        { ...base(10), kind: "set", category: "clothing", memberIds: [9] },
        {
          ...base(11),
          kind: "appearance",
          category: "clothing",
          subcategory: "发型",
          encyclopediaEntry: { listed: false },
        },
        { ...base(12), kind: "item", category: "miscellaneous", subcategory: null, attributes: {} },
      ],
    });
    const view = toCollectionView(catalog);
    expect(view.furniture.items).toEqual([
      {
        id: 1,
        name: "记录1",
        image: null,
        description: null,
        quality: null,
        category: "基础家具",
        type: "床",
        size: "1.0x2.0",
        colors: "蓝",
        materials: "木",
        sources: "商店",
      },
    ]);
    expect(view.furniture.sets).toEqual([
      {
        id: 2,
        name: "记录2",
        image: null,
        description: null,
        quality: null,
        seriesName: "记录2",
        componentIds: [1],
      },
    ]);
    expect(view.creatures.items).toMatchObject([
      {
        id: 3,
        category: "鱼",
        region: "星屿",
        habitat: "河流",
        activeSeasons: "夏",
        activeTimes: "上午",
        activeWeather: "晴",
        sizeRange: null,
      },
    ]);
    expect(view.creatures.series).toMatchObject([{ id: 4, seriesName: "记录4", creatureIds: [3] }]);
    expect(view.plants.items).toMatchObject([
      { id: 5, category: "采摘材料", originGalaxy: "星屿", maturityPeriod: null, harvestCount: 3 },
    ]);
    expect(view.plants.series).toMatchObject([{ id: 6, seriesName: "记录6", plantIds: [5] }]);
    expect(view.dishes.items).toEqual([
      {
        id: 7,
        name: "记录7",
        image: null,
        description: null,
        quality: null,
        difficulty: "简单",
        galaxyFlavor: "星屿",
        cookware: "煮锅",
        effects: "增加力气",
      },
    ]);
    expect(view.dishes.series).toMatchObject([{ id: 8, seriesName: "记录8", dishIds: [7] }]);
    expect(view.clothing.items).toMatchObject([
      { id: 9, category: "帽子", colors: "白", materials: "布", styles: "休闲", sources: "商店" },
    ]);
    expect(view.clothing.sets).toMatchObject([{ id: 10, setName: "记录10", componentIds: [9] }]);
    expect(view.clothing.appearances).toEqual([
      { id: 11, name: "记录11", image: null, description: null, quality: null, category: "发型" },
    ]);
    expect(view.miscellaneous).toEqual([
      { id: 12, name: "记录12", image: null, description: null, quality: null },
    ]);
  });

  it("preserves record and member order, null memberships, and confirmed empty memberships", () => {
    const catalog = parseCatalog({
      ...emptyCatalog(source),
      items: [
        {
          ...base(2),
          kind: "item",
          category: "plants",
          subcategory: null,
          attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null },
        },
        {
          ...base(1),
          kind: "item",
          category: "plants",
          subcategory: null,
          attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null },
        },
        { ...base(3), kind: "series", category: "plants", memberIds: [1, 2] },
        { ...base(4), kind: "series", category: "plants", memberIds: null },
        { ...base(5), kind: "series", category: "plants", memberIds: [] },
      ],
    });
    const before = structuredClone(catalog);
    const view = toCollectionView(catalog);
    expect(view.plants.items.map((record) => record.id)).toEqual([2, 1]);
    expect(view.plants.series.map((record) => record.plantIds)).toEqual([[1, 2], null, []]);
    expect(catalog).toEqual(before);
  });

  it("includes confirmed items regardless of encyclopedia presence or list visibility", () => {
    const catalog = parseCatalog({
      ...emptyCatalog(source),
      items: [
        {
          ...base(1),
          kind: "item",
          category: "miscellaneous",
          subcategory: null,
          attributes: {},
          encyclopediaEntry: null,
        },
        {
          ...base(2),
          kind: "appearance",
          category: "clothing",
          subcategory: "眼睛",
          encyclopediaEntry: { listed: false },
        },
      ],
    });
    const view = toCollectionView(catalog);
    expect(view.miscellaneous.map((record) => record.id)).toEqual([1]);
    expect(view.clothing.appearances.map((record) => record.id)).toEqual([2]);
  });
});
