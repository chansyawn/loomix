import { expect, test } from "vite-plus/test";
import { hairDyeingFixture } from "../../fixtures/hair-dyeing.ts";
import { imageCollector } from "../images.ts";
import { observeHairDyeing } from "./read.ts";

test("按解锁配置过滤色组，保留组外默认色、共享色块及客户端内部记录", ({ onTestFinished }) => {
  const { inputs, tables, hairstyleIds, flowerIds, cleanup } = hairDyeingFixture();
  onTestFinished(cleanup);
  const images = imageCollector([], new Map());
  const { data, diagnostics, proofs } = observeHairDyeing(
    inputs,
    tables,
    [],
    images,
    hairstyleIds,
    flowerIds,
  );
  expect(data.hairstyleConfigs).toEqual([
    {
      itemId: 601,
      regions: [
        { id: 40, name: "整体发色", colorGroupIds: [263, 262], defaultColorBlockId: 267 },
        { id: 6, name: "挑染发色", colorGroupIds: [], defaultColorBlockId: null },
        { id: 9, name: "整体发色", colorGroupIds: null, defaultColorBlockId: null },
      ],
    },
  ]);
  expect(data.colorGroups.map(({ id, name }) => [id, name])).toEqual([
    [262, "白色系"],
    [263, null],
    [292, null],
  ]);
  expect(data.colorBlocks.map(({ id }) => id)).toEqual([134, 136, 267, 293]);
  expect(data.flowerRules.map(({ groupId }) => groupId)).toEqual([262]);
  expect(diagnostics.hairstyles[0]?.regions[0]).toMatchObject({
    internalName: "FrontDye",
    colorGroupIds: [263, 244, 262],
  });
  expect(diagnostics.hairstyles[1]?.regions[0]?.textHash).toBeNull();
  expect(diagnostics.colorGroups[0]).toMatchObject({
    id: 244,
    internalName: "gray_internal",
    unlock: null,
  });
  expect(
    proofs
      .filter(({ fieldPath }) => fieldPath === "name")
      .map(({ entity, status }) => [entity.id, status]),
  ).toEqual([
    [262, "confirmed"],
    [263, "unresolved"],
    [292, "absent"],
  ]);
  expect(images.needs.map(({ id }) => id)).not.toContain("hairColorGroup:244:icon");
});

test("旧材质仅接受单区且所有已配置的可选组都是全染", ({ onTestFinished }) => {
  const { inputs, tables, hairstyleIds, flowerIds, cleanup } = hairDyeingFixture();
  onTestFinished(cleanup);
  const config = inputs.hairstyles[0]!.value;
  config.regions = [
    {
      regionId: 40,
      regionName: "Legacy",
      colorMaterial: {
        matProperties: ["R", "G", "B", "A"].map((channel) => ({
          propertyName: `_TintColor${channel}`,
        })),
      },
    },
  ];
  const run = () =>
    observeHairDyeing(inputs, tables, [], imageCollector([], new Map()), hairstyleIds, flowerIds);
  config.regionToColorGroups = { 40: [262, 244] };
  expect(run().data.hairstyleConfigs[0]?.regions[0]?.name).toBe("整体发色");
  config.regionToColorGroups = { 40: [262, 263] };
  expect(run).toThrow(/Unknown dyeing material for 601:40/);
  config.regionToColorGroups = { 40: [244] };
  expect(run).toThrow(/Unknown dyeing material for 601:40/);
});

test("混合发色参数、缺少区域文案或色组名称冲突时停止生成", ({ onTestFinished }) => {
  const { inputs, tables, hairstyleIds, flowerIds, cleanup } = hairDyeingFixture();
  onTestFinished(cleanup);
  const run = () =>
    observeHairDyeing(inputs, tables, [], imageCollector([], new Map()), hairstyleIds, flowerIds);
  const region = inputs.hairstyles[0]!.value.regions[0]!;
  region.colorMaterials = [{ matProperties: [{ propertyName: "_TintColorHairPartial1" }] }];
  expect(run).toThrow(/Mixed dyeing material for 601:40/);
  delete region.colorMaterials;
  const text = tables.textmap[2263953776]!;
  delete tables.textmap[2263953776];
  expect(run).toThrow(/Missing dyeing region text 601:40/);
  tables.textmap[2263953776] = text;
  tables.textmap[100002] = { ...text, nameZh: "冲突名称" };
  expect(run).toThrow(/Conflicting dyeing group names for 262/);
});
