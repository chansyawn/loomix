import { expect, test } from "vite-plus/test";
import { addFixtureRecords, assetsFixture, catalogFixture } from "../collection-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "../plants/fixture";
import { createCollectionCatalog, recordFields, recordLocation } from "./catalog";
import { collectionDetail } from "./record-detail";

test("共享目录保留集合详情及作物和种子的系列定位，公共字段移除记录形式", () => {
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1, name: "作物", category: "作物" })],
      series: [plantSeriesFixture({ id: 10, name: "作物系列", plantIds: [1] })],
      seeds: [
        plantSeedFixture({
          id: 20,
          name: "作物种子",
          plantIds: [1],
          growth: {
            id: 20,
            kind: "crop",
            cycleMode: null,
            maturityDays: null,
            initialStageIds: [21],
            regrowthStageIds: null,
            matureStages: [{ stageId: 21, tag: null, rank: null }],
            witheredStageId: null,
            harvestCount: 1,
            stages: [{ id: 21, name: "成熟", image: null, plantId: 1 }],
          },
        }),
      ],
    }),
  });
  const data = createCollectionCatalog(catalog, assetsFixture(catalog), gameplayTags);
  expect(data.rows).toHaveLength(3);
  expect(data.byId.get(10)?.record).toMatchObject({ kind: "plants.series", memberIds: [1] });
  expect(collectionDetail(data, 10)).toMatchObject({
    category: "plants",
    detail: { kind: "crop", record: { id: 10 } },
  });
  for (const id of [1, 20]) {
    const row = data.byId.get(id)!;
    expect(recordLocation(row)).toEqual({
      to: "/collections/records/$id",
      params: { id: "10" },
      search: { focus: id },
    });
  }
  for (const row of data.rows) {
    expect(recordFields(row)).toEqual([
      ["编号", String(row.id)],
      ["类别", "植物"],
      ["获取来源", null],
    ]);
  }
});

test("友邻服饰详情保留体型、友邻和玩家对应款信息", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(catalog, gameplayTags, {
    id: 40,
    name: "丰年连衣裙",
    description: "友邻服饰",
    quality: 1,
    image: null,
    kind: "neighborClothing",
    displayCategory: "连衣裙",
    trade: null,
    acquisition: null,
    slotCode: 1004,
    neighborId: 1010,
    playerItemId: 41,
    modelPaths: { small: null, medium: "NpcOutfits/Medium/40", big: "NpcOutfits/Big/40" },
  });
  addFixtureRecords(catalog, gameplayTags, {
    id: 41,
    name: "丰年连衣裙（玩家）",
    description: null,
    quality: 1,
    image: null,
    kind: "clothing",
    displayCategory: "连衣裙",
    trade: null,
    acquisition: null,
    colors: null,
    materials: null,
    styles: null,
  });
  const data = createCollectionCatalog(catalog, assetsFixture(catalog), gameplayTags);
  expect(collectionDetail(data, 40)).toMatchObject({
    category: "neighborClothing",
    detail: {
      neighborName: null,
      slotName: "连衣裙",
      modelSizes: "中型、大型",
      counterpartId: 41,
    },
  });
});
