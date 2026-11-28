import { expect, test } from "vite-plus/test";
import { addFixtureRecords, imageIndexFixture, catalogFixture } from "../omnidex-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "../plants/fixture";
import { createOmnidexCatalog } from "./catalog";
import { entryOverview } from "./entry-overview";
import { catalogEntryLocation } from "./entry-location";
import { catalogEntryDetail } from "./catalog-entry-detail";

test("花色复用同名颜色的筛选标签，保留独有的花色和通用颜色", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 10, kind: "plant", name: "黄花", flowerColors: ["黄"], colors: ["黄"] },
    { id: 11, kind: "plant", name: "双色花", flowerColors: ["紫", "黄"], colors: ["黄", "绿"] },
    { id: 12, kind: "furniture", name: "黄椅", colors: ["黄"] },
  );
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  const yellowId = gameplayTags.tags.find((tag) => tag.internalName === "黄")!.id;
  const yellow = { id: yellowId, name: "黄", filterable: true };
  const groups = (id: number) => entryOverview(data, data.byId.get(id)!).tagGroups;
  expect(groups(10)).toEqual([{ label: "花色", tags: [yellow] }]);
  expect(groups(11)).toMatchObject([
    { label: "花色", tags: [{ id: null, name: "紫", filterable: false }, yellow] },
    { label: "颜色", tags: [{ name: "绿" }] },
  ]);
  expect(groups(12)).toEqual([{ label: "颜色", tags: [yellow] }]);
});

test("同一家具的配方各自关联卡集提示和掉落该卡的来源树木", () => {
  const { catalog, gameplayTags } = catalogFixture();
  const card = {
    kind: "inspoCard",
    recipe: { productId: 1, materials: null },
    front: { background: { assetId: "card.webp", variant: "card-background" } },
  };
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 1, kind: "furniture", name: "椅子" },
    { ...card, id: 2, name: "椅子卡甲", inspoBoxId: 10 },
    { ...card, id: 3, name: "椅子卡乙", inspoBoxId: null },
    { id: 4, kind: "plant", name: "银杏树", drops: [{ itemId: 2, source: "felling" }] },
    { id: 5, kind: "plant", name: "其他树", drops: [{ itemId: 1, source: "fruit" }] },
  );
  catalog.inspoBoxes.push({ id: 10, name: "椅子卡集", acquisitionHint: "星屿商店", image: null });
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  expect(catalogEntryDetail(data, 1)).toMatchObject({
    detail: {
      recipes: [
        {
          id: 2,
          inspoBoxName: "椅子卡集",
          inspoBoxHint: "星屿商店",
          sourceTrees: [{ id: 4, sources: ["felling"] }],
        },
        { id: 3, inspoBoxName: null, inspoBoxHint: null, sourceTrees: [] },
      ],
    },
  });
});

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
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  expect(data.rows).toHaveLength(3);
  expect(data.byId.get(10)?.record).toMatchObject({ memberKind: "plant", memberIds: [1] });
  expect(catalogEntryDetail(data, 10)).toMatchObject({
    category: "plants",
    detail: { kind: "series", record: { id: 10 } },
  });
  for (const [id, kind] of [
    [1, "item"],
    [20, "seed"],
    [10, "series"],
  ] as const) {
    const row = data.byId.get(id)!;
    expect(catalogEntryLocation(row)).toEqual({
      to: "/catalog/$id",
      params: { id: String(id) },
      search: {},
    });
    expect(catalogEntryDetail(data, id)).toMatchObject({
      category: "plants",
      detail: { kind, record: { id } },
    });
  }
  expect(entryOverview(data, data.byId.get(1)!).memberships).toMatchObject([{ id: 10 }]);
  expect(entryOverview(data, data.byId.get(20)!).memberships).toEqual([]);
});

test("同名的玩家款和友邻款共享配对和套装导航，导航只含正式成员", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      id: 40,
      name: "露草斗笠",
      kind: "neighborOutfit",
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
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  const counterpart = { kind: "pair", playerId: 41, neighborId: 40 };
  const navigation = { groups: [{ entries: [{ id: 43 }, { id: 41 }, { id: 42 }] }] };
  expect(catalogEntryDetail(data, 40)).toMatchObject({
    category: "clothing",
    detail: {
      kind: "neighborOutfit",
      record: { id: 40 },
      counterpart,
      navigation: { ...navigation, highlightedId: 41 },
      slotName: "帽子",
      modelSizes: "中型、大型",
    },
  });
  expect(entryOverview(data, data.byId.get(40)!).memberships).toEqual([]);
  expect(catalogEntryDetail(data, 41)).toMatchObject({
    category: "clothing",
    detail: {
      kind: "item",
      record: { id: 41 },
      counterpart,
      navigation,
    },
  });
  for (const id of [42, 43, 44]) {
    expect(catalogEntryDetail(data, id)).toMatchObject({ detail: { counterpart: null } });
  }
});

test("多件友邻款指向同一玩家款时，各友邻款保留单向链接", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 40, name: "友邻帽子甲", kind: "neighborOutfit", playerItemId: 42 },
    { id: 41, name: "友邻帽子乙", kind: "neighborOutfit", playerItemId: 42 },
    { id: 42, name: "玩家帽子", kind: "clothing" },
  );
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  for (const id of [40, 41]) {
    expect(catalogEntryDetail(data, id)).toMatchObject({
      detail: {
        counterpart: { kind: "player-link", playerId: 42 },
        navigation: null,
      },
    });
  }
  expect(catalogEntryDetail(data, 42)).toMatchObject({ detail: { counterpart: null } });
});

test("友邻款的对应玩家物品为空、缺失或仅供引用时不生成链接", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 40, name: "无对应款", kind: "neighborOutfit", neighborId: 1010 },
    { id: 41, name: "目标缺失", kind: "neighborOutfit", playerItemId: 43 },
    { id: 42, name: "目标仅供引用", kind: "neighborOutfit", playerItemId: 44 },
    { id: 44, name: "仅供引用的玩家款", kind: "reference" },
  );
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  for (const id of [40, 41, 42]) {
    expect(catalogEntryDetail(data, id)).toMatchObject({
      detail: { counterpart: null, navigation: null },
    });
  }
});
