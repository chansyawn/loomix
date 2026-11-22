import { expect, test } from "vite-plus/test";
import { addFixtureRecords, imageIndexFixture, catalogFixture } from "../collection-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "../plants/fixture";
import { createCollectionCatalog, recordFields } from "./catalog";
import { recordLocation } from "./item-route";
import { collectionDetail } from "./record-detail";

test("共享目录为植物、种子和系列保留独立详情及公共字段", () => {
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
            kind: "crop",
            initialStageIds: [21],
            regrowthStageIds: [],
            matureStages: [{ stageId: 21, tag: null, rank: null }],
            witheredStageId: null,
            harvestCount: 1,
            stages: [{ id: 21, name: "成熟", image: null, plantId: 1 }],
          },
        }),
      ],
    }),
  });
  const data = createCollectionCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  expect(data.rows).toHaveLength(3);
  expect(data.byId.get(10)?.record).toMatchObject({ memberKind: "plant", memberIds: [1] });
  expect(collectionDetail(data, 10)).toMatchObject({
    category: "plants",
    detail: { kind: "series", record: { id: 10 } },
  });
  for (const [id, kind] of [
    [1, "item"],
    [20, "seed"],
    [10, "series"],
  ] as const) {
    const row = data.byId.get(id)!;
    expect(recordLocation(row)).toEqual({
      to: "/collections/records/$id",
      params: { id: String(id) },
      search: {},
    });
    expect(collectionDetail(data, id)).toMatchObject({
      category: "plants",
      detail: { kind, record: { id } },
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

test("同名的玩家款和友邻款共享配对和套装导航，导航只含正式成员", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      id: 40,
      name: "露草斗笠",
      kind: "neighborClothing",
      category: "帽子",
      neighborId: 1010,
      playerItemId: 41,
      bodyTypes: ["medium", "big"],
    },
    { id: 41, name: "露草斗笠", kind: "clothing", category: "帽子" },
    { id: 42, name: "露草上衣", kind: "clothing" },
    { id: 43, name: "露草耕种", memberKind: "clothing", memberIds: [41, 42] },
    { id: 44, name: "露草外观", kind: "appearance" },
  );
  const data = createCollectionCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  const counterpart = { kind: "pair", playerId: 41, neighborId: 40 };
  const navigation = { groups: [{ entries: [{ id: 43 }, { id: 41 }, { id: 42 }] }] };
  expect(collectionDetail(data, 40, "友邻甲")).toMatchObject({
    category: "clothing",
    detail: {
      kind: "neighborClothing",
      record: { id: 40 },
      counterpart,
      navigation: { ...navigation, highlightedId: 41 },
      neighborName: "友邻甲",
      slotName: "帽子",
      modelSizes: "中型、大型",
    },
  });
  expect(collectionDetail(data, 41)).toMatchObject({
    category: "clothing",
    detail: {
      kind: "item",
      record: { id: 41 },
      counterpart,
      navigation,
    },
  });
  for (const id of [42, 43, 44]) {
    expect(collectionDetail(data, id)).toMatchObject({ detail: { counterpart: null } });
  }
});

test("多件友邻款指向同一玩家款时，各友邻款保留单向链接", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 40, name: "友邻帽子甲", kind: "neighborClothing", playerItemId: 42 },
    { id: 41, name: "友邻帽子乙", kind: "neighborClothing", playerItemId: 42 },
    { id: 42, name: "玩家帽子", kind: "clothing" },
  );
  const data = createCollectionCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  for (const id of [40, 41]) {
    expect(collectionDetail(data, id)).toMatchObject({
      detail: {
        counterpart: { kind: "player-link", playerId: 42 },
        navigation: null,
      },
    });
  }
  expect(collectionDetail(data, 42)).toMatchObject({ detail: { counterpart: null } });
});

test("友邻款的对应玩家物品为空、缺失或仅供引用时不生成链接", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 40, name: "无对应款", kind: "neighborClothing", neighborId: 1010 },
    { id: 41, name: "目标缺失", kind: "neighborClothing", playerItemId: 43 },
    { id: 42, name: "目标仅供引用", kind: "neighborClothing", playerItemId: 44 },
    { id: 44, name: "仅供引用的玩家款", kind: "reference" },
  );
  const data = createCollectionCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  for (const id of [40, 41, 42]) {
    expect(collectionDetail(data, id)).toMatchObject({
      detail: { counterpart: null, navigation: null },
    });
  }
});
