import { expect, test } from "vite-plus/test";
import { assetsFixture, catalogFixture } from "../collection-fixture";
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
  expect(data.byId.get(10)?.record).toMatchObject({ type: "plants.series", memberIds: [1] });
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
