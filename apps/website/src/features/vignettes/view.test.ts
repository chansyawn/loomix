import type { ItemOf } from "@loomix/schema/catalog";
import { createImageResolver } from "@loomix/schema/assets";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { expect, test } from "vite-plus/test";
import {
  datasetFixture,
  material,
  neighbor,
  reference,
  vignette,
} from "../../../../../packages/schema/tests/fixture";
import { findVignetteUses } from "./requirement-matching";
import { creatureVignettes, toVignetteDetail, toVignetteList } from "./view";
import { neighborFixture } from "../neighbors/fixture";

const entry = vignette();
const assets = {
  images: [
    {
      ...entry.illustration,
      file: `assets/${"a".repeat(64)}.webp`,
      sha256: "a".repeat(64),
      width: 1024,
      height: 512,
      bytes: 1,
    },
  ],
};

test("关联小栖地只查询生物名单，摆放物、示例和同号友邻各自独立", () => {
  const related = vignette(1002);
  related.creatureItemIds = [44103];
  const placement = vignette(2000);
  placement.requirements[0]!.target = { itemId: 44103 };
  placement.requirements[0]!.examples = [{ itemId: 44103, quantity: 1 }];
  placement.neighborIds = [44103];
  const data = { templates: [related, placement], fallbackItems: [] };
  const image = createImageResolver(assets);
  expect(creatureVignettes(data, 44103, image)).toEqual([
    { id: 1002, name: "微风花丛地", image: assets.images[0]!.file },
  ]);
  expect(creatureVignettes(data, 2, image)).toEqual([]);
});

test("关联友邻和友邻详情优先使用同一张好感插画", () => {
  const dataset = datasetFixture();
  const { database, mapping } = neighborFixture();
  const template = vignette();
  template.requirements = [];
  template.neighborIds = [1, 2, 4];
  dataset.vignettes.templates.push(template);
  const detail = toVignetteDetail(template.id, {
    ...dataset,
    neighbors: database,
    imageIndex: { images: [...assets.images, ...mapping.images] },
  });
  expect(detail?.neighbors.map(({ image }) => image)).toEqual([
    `assets/${"b".repeat(64)}.webp`,
    `assets/${"c".repeat(64)}.webp`,
    null,
  ]);
});

test("列表按模板 ID 排序并解析地形和配图", () => {
  const vignettes = { templates: [vignette(2001), entry], fallbackItems: [] };
  vignettes.templates[0]!.site = "water-edge";
  expect(toVignetteList(vignettes, assets)).toEqual([
    expect.objectContaining({ id: 1002, terrain: "陆地", size: "6 × 6 格", stars: "2 星" }),
    expect.objectContaining({ id: 2001, terrain: "水边", image: assets.images[0]!.file }),
  ]);
  expect(() => toVignetteList(vignettes, { images: [] })).toThrow("illustration");
});

test("物品匹配要求标签相交且包含子标签，承载条件显示为描述", () => {
  const dataset = datasetFixture();
  const template = vignette();
  template.requirements[0] = {
    target: { allTagIds: [20, 30] },
    support: { allTagIds: [40] },
    label: { zh: "任意食物", en: "Any food" },
    quantity: { displayed: 2, configured: 3 },
    area: null,
    examples: [{ itemId: 2, quantity: 1 }],
  };
  dataset.vignettes.templates.push(template);
  dataset.catalog.items = [
    { ...material(4), tagIds: [20, 30] },
    { ...material(2), tagIds: [20] },
    { ...material(1), tagIds: [20, 21, 30] },
    { ...material(5), tagIds: [40] },
    reference(6),
  ];
  dataset.gameplayTags.tags = [
    { id: 20, internalName: "食物", displayName: null, parentId: null },
    { id: 21, internalName: "甜食", displayName: null, parentId: 20 },
    { id: 30, internalName: "点心", displayName: null, parentId: null },
    { id: 40, internalName: "置物桌", displayName: "桌子", parentId: null },
  ];
  const detail = toVignetteDetail(template.id, { ...dataset, imageIndex: assets });
  expect(detail?.requirements[0]).toMatchObject({
    target: { kind: "tags", labels: ["食物", "点心"], matches: [{ id: 1 }, { id: 4 }] },
    support: "桌子",
    quantity: 2,
    sizeLabel: null,
    examples: [{ item: { id: 2 }, quantity: 1 }],
  });
  expect(detail?.placementRules).toEqual([]);
});

test("尺寸标签约束摆放家具，详情与反查使用相同条件", () => {
  const dataset = datasetFixture();
  const template = vignette();
  const requirement = {
    ...template.requirements[0]!,
    target: { allTagIds: [10, 12] },
    support: null,
  };
  template.requirements = [
    { ...requirement, area: { width: 2, height: 2 }, support: requirement.target },
    { ...requirement, area: { width: 3, height: 2 } },
    { ...requirement, area: { width: 2, height: 3 } },
    { ...requirement, area: null },
    { ...requirement, area: { width: 2, height: 3 }, target: { itemId: 3 } },
  ];
  const furniture = (id: number, tagIds: number[]): ItemOf<"furniture"> => ({
    ...material(id),
    kind: "furniture",
    category: null,
    furnitureCategory: null,
    size: null,
    tagIds,
  });
  dataset.catalog.items = [
    furniture(1, [11, 12, 20]),
    furniture(2, [10, 12, 21]),
    furniture(3, [10, 12, 22]),
    furniture(4, [10, 20]),
    { ...material(5), tagIds: [10, 12, 20] },
  ];
  dataset.vignettes.templates.push(template);
  dataset.gameplayTags.tags = [
    { id: 10, internalName: "座椅", displayName: null, parentId: null },
    { id: 11, internalName: "椅子", displayName: null, parentId: 10 },
    { id: 12, internalName: "木质", displayName: null, parentId: null },
    { id: 20, internalName: "尺寸_1_1", displayName: null, parentId: null },
    { id: 21, internalName: "尺寸_1a5_1", displayName: null, parentId: null },
    { id: 22, internalName: "尺寸_其他", displayName: null, parentId: 20 },
  ];

  const detail = toVignetteDetail(template.id, { ...dataset, imageIndex: assets });
  expect(detail?.requirements).toMatchObject([
    {
      sizeLabel: "1 × 1",
      target: { matches: [{ id: 1 }] },
      support: "座椅 且 木质",
    },
    { sizeLabel: "1.5 × 1", target: { matches: [{ id: 2 }] } },
    { sizeLabel: "1 × 1.5", target: { matches: [] } },
    { sizeLabel: null, target: { matches: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }] } },
    { sizeLabel: "1 × 1.5", target: { kind: "item", item: { id: 3 } } },
  ]);

  const tagIndex = createGameplayTagIndex(dataset.gameplayTags.tags);
  expect(
    dataset.catalog.items.map((item) =>
      findVignetteUses([template], item, tagIndex).flatMap(({ conditions }) =>
        conditions.map(({ position, role }) => [position, role]),
      ),
    ),
  ).toEqual([
    [
      [1, "摆放物"],
      [1, "承载物"],
      [4, "摆放物"],
    ],
    [
      [1, "承载物"],
      [2, "摆放物"],
      [4, "摆放物"],
    ],
    [
      [1, "承载物"],
      [4, "摆放物"],
      [5, "摆放物"],
    ],
    [],
    [
      [1, "承载物"],
      [4, "摆放物"],
    ],
  ]);
});

test("指定物品补入示例，已有的同物品示例沿用客户端数量", () => {
  const dataset = datasetFixture();
  const template = vignette();
  const requirement = template.requirements[0]!;
  const support = { itemId: 2 };
  template.requirements = [
    { ...requirement, quantity: { configured: 2, displayed: 1 } },
    { ...requirement, target: { itemId: 3 }, support, examples: [{ itemId: 3, quantity: 2 }] },
    { ...requirement, target: { itemId: 4 }, examples: [{ itemId: 3, quantity: 2 }] },
  ];
  dataset.vignettes.templates.push(template);
  dataset.catalog.items = [{ ...material(2), name: "展台" }, material(3), material(4)];

  const detail = toVignetteDetail(template.id, { ...dataset, imageIndex: assets });
  expect(detail?.requirements).toMatchObject([
    { support: null, examples: [{ item: { id: 2 }, quantity: 1 }] },
    { support: "展台", examples: [{ item: { id: 3 }, quantity: 2 }] },
    { examples: [{ item: { id: 4 } }, { item: { id: 3 }, quantity: 2 }] },
  ]);
});

test("未收录的指定物品用补名生成示例", () => {
  const dataset = datasetFixture();
  const template = vignette();
  template.neighborIds = [3];
  template.requirements[0]!.support = { allTagIds: [8] };
  dataset.vignettes.templates.push(template);
  dataset.vignettes.fallbackItems.push({ id: 2, name: { zh: "花株", en: "Flower" } });
  dataset.neighbors.neighbors.push(neighbor(3));
  dataset.gameplayTags.tags = [
    { id: 8, internalName: "置物桌", displayName: "桌子", parentId: null },
  ];
  const detail = toVignetteDetail(template.id, { ...dataset, imageIndex: assets });
  expect(detail?.requirements[0]).toMatchObject({
    target: { kind: "item", item: { name: "花株", browsable: false } },
    support: "桌子",
    examples: [{ item: { name: "花株", browsable: false } }],
  });
  expect(detail?.neighbors).toMatchObject([{ id: 3, name: "蛮蛮" }]);
  expect(toVignetteDetail(9999, { ...dataset, imageIndex: assets })).toBeNull();
});

test("物品相邻和靠水规则进入对应行，布景级条件只展示额外规则", () => {
  const dataset = datasetFixture();
  const template = vignette();
  const requirement = template.requirements[0]!;
  const bench = { itemId: 2 };
  const shrubs = { allTagIds: [10, 20] };
  const ruleShrubs = { allTagIds: [20, 10] };
  template.requirements = [
    { ...requirement, target: bench },
    { ...requirement, target: shrubs },
    { ...requirement, target: { itemId: 3 } },
  ];
  template.placementRules.push(
    { kind: "adjacent", ruleId: 2, text: null, targets: [bench, ruleShrubs] },
    { kind: "near-water", ruleId: 4, text: null, target: ruleShrubs },
    { kind: "align-water", ruleId: 9, text: null },
  );
  dataset.vignettes.templates.push(template);
  dataset.catalog.items = [
    { ...material(2), name: "长椅" },
    { ...material(3), name: "地砖" },
  ];
  dataset.gameplayTags.tags = [
    { id: 10, internalName: "灌木", displayName: null, parentId: null },
    { id: 20, internalName: "花植", displayName: null, parentId: null },
  ];

  const detail = toVignetteDetail(template.id, { ...dataset, imageIndex: assets });
  expect(detail?.requirements.map(({ instructions }) => instructions)).toEqual([
    ["与花植 且 灌木相邻摆放"],
    ["与长椅相邻摆放", "靠近水域"],
    [],
  ]);
  expect(detail?.placementRules).toEqual([{ id: 9, label: "与水边对齐", targets: [] }]);
});

test("成组相邻沿用客户端文案，无法唯一定位的规则保留在表格上方", () => {
  const dataset = datasetFixture();
  const template = vignette();
  const requirement = template.requirements[0]!;
  const fences = { allTagIds: [10] };
  template.requirements = [
    { ...requirement, target: fences },
    { ...requirement, target: { itemId: 2 } },
    { ...requirement, target: { itemId: 2 } },
  ];
  template.placementRules.push(
    {
      kind: "adjacent",
      ruleId: 7,
      text: { zh: "所有栅栏相邻", en: "All fences are adjacent" },
      targets: [fences, fences, fences],
    },
    { kind: "adjacent", ruleId: 8, text: null, targets: [fences, { itemId: 2 }] },
  );
  dataset.vignettes.templates.push(template);
  dataset.catalog.items = [material(2)];
  dataset.gameplayTags.tags = [{ id: 10, internalName: "栅栏", displayName: null, parentId: null }];

  const detail = toVignetteDetail(template.id, { ...dataset, imageIndex: assets });
  expect(detail?.requirements.map(({ instructions }) => instructions)).toEqual([
    ["所有栅栏相邻"],
    [],
    [],
  ]);
  expect(detail?.placementRules.map(({ id }) => id)).toEqual([8]);
});
