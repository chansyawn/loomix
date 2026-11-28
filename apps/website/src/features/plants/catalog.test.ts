import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { expect, test } from "vite-plus/test";
import { addFixtureRecords, imageIndexFixture, catalogFixture } from "../omnidex-fixture";
import { toOmnidexView } from "../omnidex-view";
import { queryPlants } from "./query";
import { emptyQuery } from "./search";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "./fixture";

test("按植株自身身份检索种子链内作物和链外花株", () => {
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [
        plantItemFixture({ id: 1, name: "番茄", category: "作物" }),
        plantItemFixture({ id: 2, name: "灿黄百合", category: "花" }),
      ],
      seeds: [plantSeedFixture({ plantIds: [1] })],
      series: [],
    }),
  });
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 1001, kind: "cropPlant", name: "番茄株", harvestItemId: 1, quality: 0 },
    { id: 56000, kind: "flowerPlant", name: "灿黄百合株", harvestItemId: 2, quality: 3 },
  );
  const { plants } = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(plants.seeds[0].growth.stages).toMatchObject([{ id: 1001, plantId: 1, stockId: 1001 }]);
  expect(plants.items.map((item) => item.id)).toEqual([1, 2]);
  expect(plants.harvestablePlants.map((stock) => [stock.id, stock.harvest.id])).toEqual([
    [1001, 1],
    [56000, 2],
  ]);
  const rows = (patch: Partial<ReturnType<typeof emptyQuery>>) =>
    queryPlants(plants, "harvestablePlants", { ...emptyQuery(), ...patch }).rows.map(
      (row) => row.id,
    );
  expect(rows({})).toEqual([1001, 56000]);
  expect(rows({ categories: ["作物株"] })).toEqual([1001]);
  expect(rows({ categories: ["花株"] })).toEqual([56000]);
  for (const q of ["百合株", "canhuangbaihezhu"]) expect(rows({ q })).toEqual([56000]);
  expect(rows({ q: "灿黄", categories: ["作物株"] })).toEqual([]);
  expect(rows({ sort: "quality-asc" })).toEqual([1001, 56000]);
  expect(rows({ sort: "quality-desc" })).toEqual([56000, 1001]);
  expect(rows({ sort: "name-asc" })).toEqual([56000, 1001]);
});

test("植物视图保留种子和单品关联，共享食材使用物品自身身份", () => {
  const { catalog, gameplayTags } = catalogFixture({
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
  const view = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(view.plants.items.map((item) => item.id)).toEqual([1, 2]);
  expect(view.plants.seeds[0]).toMatchObject({ id: 30, plantIds: [1] });
  expect(view.plants.series[0].summary.seeds.map((seed) => seed.id)).toEqual([30]);
  expect(view.ingredientItemsById.get(1)).toMatchObject({ id: 1, catalogCategory: "plants" });
});

test("summarizes structured origins without parsing punctuation in localized labels", () => {
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1, name: "植物", category: "作物" })],
      series: [plantSeriesFixture({ id: 2, plantIds: [1] })],
    }),
  });
  const plant = catalog.items[0]!;
  if (plant.kind !== "plant") throw new Error("Expected plant");
  const rootId = 1000;
  gameplayTags.tags.push(
    { id: rootId, internalName: "产区分类", displayName: null, parentId: null },
    {
      id: 1001,
      internalName: "禾夏，星系",
      displayName: "禾夏，星系",
      parentId: rootId,
    },
    { id: 1002, internalName: "帕沙", displayName: "帕沙", parentId: rootId },
  );
  plant.tagIds = [1001, 1002];
  const data = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  ).plants;
  expect(data.series[0].summary.galaxies).toEqual(["禾夏，星系", "帕沙"]);
});
test("derives every seed for a plant from stage references without duplicate product fields", () => {
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1 })],
      series: [],
      seeds: [plantSeedFixture({ id: 10 }), plantSeedFixture({ id: 11 })],
    }),
  });
  const data = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  ).plants;
  expect(data.items[0].summary.seeds.map((seed) => seed.id)).toEqual([10, 11]);
  expect(data.items[0].summary.growths).toHaveLength(2);
  expect(data.seeds[0].growth.kind).toBe("staged");
  expect(catalog.items.find((item) => item.kind === "seed")).not.toHaveProperty("productIds");
});

test("掉落保留来源树种与果实，系列按成员分组", () => {
  const drop = { itemId: 3, source: "felling" as const };
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [
        plantItemFixture({
          id: 1,
          name: "苹果树",
          treeDrops: [drop, { itemId: 4, source: "fruit" }],
        }),
        plantItemFixture({
          id: 2,
          name: "花树",
          treeDrops: [drop],
        }),
        plantItemFixture({ id: 3, name: "树胶" }),
        plantItemFixture({ id: 4, name: "果实" }),
      ],
      series: [plantSeriesFixture({ id: 10, plantIds: [2, 1] })],
    }),
  });
  catalog.items = catalog.items.filter((item) => item.id !== 3);
  catalog.items.push({ kind: "reference", id: 3, name: "树胶", description: null, image: null });
  const data = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  ).plants;
  const groups = data.series[0].summary.drops.groups;
  expect(groups.map((group) => group.treeId)).toEqual([2, 1]);
  expect(groups[0].entries[0]).toMatchObject({
    item: { id: 3, name: "树胶", browsable: false },
    inspoCard: null,
  });
  expect(groups[1].entries[1]).toMatchObject({ itemId: 4, source: "fruit" });
  expect(data.sourceTreesByItemId.get(3)?.map((item) => item.id)).toEqual([1, 2]);
});

test("树木掉落的创想卡共用配方卡面并指向产物", () => {
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1, treeDrops: [{ itemId: 3, source: "felling" }] })],
      series: [],
    }),
  });
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      kind: "furniture",
      id: 2,
      name: "木椅",
      image: { assetId: "chair.webp", variant: "icon" },
    },
    {
      kind: "inspoCard",
      id: 3,
      name: "创想卡：木椅",
      image: { assetId: "card-icon.webp", variant: "icon" },
      front: { background: { assetId: "card-frame.webp", variant: "card-background" } },
      inspoBoxId: null,
      recipe: { productId: 2, materials: null },
    },
  );
  const view = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  const [drop] = view.plants.items[0].summary.drops.groups[0].entries;
  expect(drop).toMatchObject({
    itemId: 3,
    item: { name: "创想卡：木椅", browsable: false },
    inspoCard: {
      face: view.furniture.items[0].inspoCards[0].face,
      product: { id: 2, name: "木椅" },
    },
  });
  expect(drop.inspoCard?.face.foreground).toBe("chair.webp");
});

test("flower and tree stage mappings include formal intermediate shrubs without linking fruit as a seed product", () => {
  const tree = plantSeedFixture({
    id: 20,
    plantIds: [1],
    growth: {
      kind: "staged",
      stages: [
        { id: 10, name: "苗", image: null, plantId: null },
        { id: 1, name: "树", image: null, plantId: 1 },
        { id: 11, name: "后续形态", image: null, plantId: null },
      ],
    },
  });
  const flower = plantSeedFixture({ id: 21, plantIds: [3] });
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [
        plantItemFixture({
          id: 1,
          treeDrops: [{ itemId: 2, source: "fruit" }],
        }),
        plantItemFixture({ id: 2 }),
        plantItemFixture({ id: 3 }),
      ],
      series: [plantSeriesFixture({ id: 100, plantIds: [1, 3] })],
      seeds: [tree, flower],
    }),
  });
  const data = toOmnidexView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  ).plants;
  expect(data.items[0].summary.seeds.map((seed) => seed.id)).toEqual([20]);
  expect(data.items[1].summary.seeds).toEqual([]);
  expect(data.items[2].summary.seeds.map((seed) => seed.id)).toEqual([21]);
  expect(data.series[0].summary.growths).toHaveLength(2);
  expect(data.items[0].summary.growths[0].growth.stages.at(-1)?.id).toBe(11);
});
