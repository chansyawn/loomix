import { expect, test } from "vite-plus/test";
import {
  datasetFixture,
  material,
  neighbor,
  reference,
  vignette,
} from "../../../../../packages/schema/tests/fixture";
import { toVignetteDetail, toVignetteList } from "./view";

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

test("列表按模板 ID 排序并解析地形和配图", () => {
  const vignettes = { templates: [vignette(2001), entry], fallbackItems: [] };
  vignettes.templates[0]!.site = "water-edge";
  expect(toVignetteList(vignettes, assets)).toEqual([
    expect.objectContaining({ id: 1002, terrain: "陆地", size: "6 × 6 格", stars: "2 星" }),
    expect.objectContaining({ id: 2001, terrain: "水边", image: assets.images[0]!.file }),
  ]);
  expect(() => toVignetteList(vignettes, { images: [] })).toThrow("illustration");
});

test("目标与承载物独立匹配，标签条件相交且包含子标签", () => {
  const dataset = datasetFixture();
  const template = vignette();
  template.requirements[0] = {
    target: { allTagIds: [20, 30] },
    support: { allTagIds: [40] },
    label: { zh: "任意食物", en: "Any food" },
    quantity: { displayed: 2, configured: 3 },
    area: { width: 2, height: 2 },
    examples: [{ itemId: 2, quantity: 2 }],
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
  const detail = toVignetteDetail(template.id, { ...dataset, assets });
  expect(detail?.requirements[0]).toMatchObject({
    target: { kind: "tags", labels: ["食物", "点心"], matches: [{ id: 1 }, { id: 4 }] },
    support: { kind: "tags", labels: ["桌子"], matches: [{ id: 5 }] },
    quantity: { displayed: 2, configured: 3 },
    area: "2 × 2 格",
  });
  expect(detail?.requirements[0]).not.toHaveProperty("examples");
});

test("空的标签匹配保留条件，指定物品可使用补名", () => {
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
  const detail = toVignetteDetail(template.id, { ...dataset, assets });
  expect(detail?.requirements[0]).toMatchObject({
    target: { kind: "item", item: { name: "花株", browsable: false } },
    support: { kind: "tags", labels: ["桌子"], matches: [] },
  });
  expect(detail?.neighbors).toMatchObject([{ id: 3, name: "蛮蛮" }]);
  expect(toVignetteDetail(9999, { ...dataset, assets })).toBeNull();
});
