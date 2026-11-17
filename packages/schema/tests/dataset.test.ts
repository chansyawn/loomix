import { expect, test } from "vite-plus/test";
import { parseDataset, validateDataset } from "../src/dataset/index.ts";
import { CatalogSchema } from "../src/catalog/index.ts";
import type { ItemOf } from "../src/catalog/index.ts";
import { DocumentKindSchema, parseRelease } from "../src/release/index.ts";
import { referencedImages } from "../src/dataset/images.ts";
import {
  collection,
  context,
  datasetFixture,
  material,
  neighbor,
  plant,
  reference,
  seed,
  source,
} from "./fixture.ts";

const messages = (dataset: ReturnType<typeof datasetFixture>) =>
  validateDataset(dataset).map((issue) => issue.message);

test("解析拒绝未知字段且不修改输入", () => {
  const dataset = datasetFixture();
  expect(parseDataset(dataset)).toEqual(dataset);
  expect(() => CatalogSchema.parse({ ...dataset.catalog, references: [] })).toThrow();
  expect(() => parseDataset({ ...dataset, world: {} })).toThrow();
  expect(() =>
    CatalogSchema.parse({ ...dataset.catalog, items: [{ ...material(1), trade: null }] }),
  ).toThrow();
  expect(dataset.catalog.items).toEqual([]);
});

test("正式物品与引用物品共享同一身份空间", () => {
  const dataset = datasetFixture();
  dataset.catalog.items.push(reference(1), material(1));
  dataset.catalog.collections.push(collection(2, "furniture", [1, 99]));
  const result = messages(dataset);
  expect(result).toContain("Duplicate identity 1");
  expect(result).toContain("Unknown furniture 1");
  expect(result).toContain("Unknown furniture 99");
});

test("未知成员与确认为空的成员保持区分", () => {
  const { catalog } = datasetFixture();
  catalog.collections.push(collection(1, "plant", null), collection(2, "plant", []));
  expect(() =>
    CatalogSchema.parse({
      ...catalog,
      collections: [{ ...collection(3, "plant", []), tagIds: [] }],
    }),
  ).toThrow();
  expect(CatalogSchema.parse(catalog).collections.map((entry) => entry.memberIds)).toEqual([
    null,
    [],
  ]);
});

test("种子内嵌生长配置，阶段必须指向正式植物", () => {
  const dataset = datasetFixture();
  const growth = {
    kind: "staged" as const,
    stages: [{ id: 20, name: "植株", image: null, plantId: 1 }],
  };
  dataset.catalog.items.push(reference(1), seed(10, growth));
  expect(messages(dataset)).toContain("Unknown plant 1");
  dataset.catalog.items[0] = plant(1);
  expect(validateDataset(dataset)).toEqual([]);
});

test("友邻服饰必须关联已知友邻或玩家服饰", () => {
  const dataset = datasetFixture();
  const outfit: ItemOf<"neighborClothing"> = {
    ...material(1160001),
    kind: "neighborClothing",
    category: "头戴物",
    neighborId: 11,
    playerItemId: 60001,
    bodyTypes: ["small", "big"],
    price: 120,
  };
  dataset.neighbors.neighbors.push(neighbor(11));
  dataset.catalog.items.push(reference(60001), outfit);
  expect(parseDataset(dataset).catalog.items[1]).toEqual(outfit);
  expect(() =>
    CatalogSchema.parse({ ...dataset.catalog, items: [{ ...outfit, bodyTypes: [] }] }),
  ).toThrow();
  outfit.neighborId = 999;
  outfit.playerItemId = 2;
  dataset.catalog.items.push(material(2));
  const result = messages(dataset);
  expect(result).toContain("Unknown neighbor 999");
  expect(result).toContain("Unknown clothing/reference 2");
  outfit.neighborId = null;
  outfit.playerItemId = null;
  expect(messages(dataset)).toContain("Neighbor clothing needs a resolvable association");
});

test("友邻子数据按友邻内嵌，礼物引用物品与标签字典", () => {
  const dataset = datasetFixture();
  const owner = neighbor(11);
  owner.gifts.love = { itemIds: [1, 1], tagIds: [7] };
  owner.stories = [
    { chapter: 1, title: "故事", paragraphs: [{ layout: "text", text: "正文", image: null }] },
    { chapter: 1, title: "故事", paragraphs: [{ layout: "text", text: "正文", image: null }] },
  ];
  dataset.neighbors.neighbors.push(owner);
  const result = messages(dataset);
  expect(result).toContain("Duplicate identity 1");
  expect(result).toContain("Unknown item 1");
  expect(result).toContain("Unknown tag 7");
});

test("所有嵌套图片引用使用同一遍历并校验资源覆盖", () => {
  const dataset = datasetFixture();
  const image = { assetId: "source-image", variant: "icon" as const };
  const story = { assetId: "story", variant: "illustration" as const };
  const owner = neighbor(11);
  owner.stories = [
    { chapter: 1, title: "故事", paragraphs: [{ layout: "image", text: null, image: story }] },
  ];
  dataset.neighbors.neighbors.push(owner);
  dataset.catalog.items.push({ ...material(1), image });
  expect(referencedImages(dataset)).toEqual([image, story]);
  expect(() =>
    parseRelease({
      manifest: {
        ...context,
        source,
        files: DocumentKindSchema.options.map((kind) => ({
          kind,
          path: kind === "assets" ? "assets.json" : `zh-CN/${kind}.json`,
          sha256: "b".repeat(64),
          bytes: 1,
        })),
      },
      dataset,
      assets: { images: [] },
    }),
  ).toThrow("Missing image");
});
