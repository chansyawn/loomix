import { expect, test } from "vite-plus/test";
import { emptyDataset, parseDataset, validateDataset } from "../src/dataset/index.ts";
import { CatalogSchema } from "../src/catalog/index.ts";
import { parseRelease } from "../src/release/index.ts";
import { referencedImages } from "../src/dataset/images.ts";
const context = { formatVersion: 1, snapshotId: "a".repeat(64), locale: "zh-CN" } as const;
const source = { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" };
const base = { id: 1, name: "物品", image: null, quality: null, description: null };

test("parsing rejects unknown fields and versions without mutating the input", () => {
  const dataset = emptyDataset(context, source);
  expect(parseDataset(dataset)).toEqual(dataset);
  expect(() => CatalogSchema.parse({ ...dataset.catalog, formatVersion: 2 })).toThrow();
  expect(() => CatalogSchema.parse({ ...dataset.catalog, details: [] })).toThrow();
  expect(dataset.catalog.items).toEqual([]);
});
test("reference items can participate in relationships but cannot become catalog entries", () => {
  const dataset = emptyDataset(context, source);
  dataset.catalog.items.push({ ...base, type: "reference" });
  expect(validateDataset(dataset)).toEqual([]);
  dataset.catalog.entries.push({ entity: { kind: "item", id: 1 }, encyclopedia: null });
  expect(validateDataset(dataset)).toContainEqual(
    expect.objectContaining({ message: "Entry requires a classified entity" }),
  );
});
test("duplicate entities, dangling groups and ingredient cycles are reported together", () => {
  const dataset = emptyDataset(context, source);
  dataset.catalog.items.push({ ...base, type: "reference" }, { ...base, type: "reference" });
  dataset.catalog.groups.push({ ...base, type: "furniture.set", memberIds: [99] });
  dataset.catalog.ingredientCategories.push({
    id: 2,
    name: "类别",
    tagName: "tag",
    parentId: 2,
    itemIds: [],
  });
  const messages = validateDataset(dataset).map((issue) => issue.message);
  expect(messages).toContain("Duplicate identity 1");
  expect(messages).toContain("Unknown furniture 99");
  expect(messages).toContain("Ingredient category cycle");
});
test("unknown member sets remain distinct from confirmed empty sets", () => {
  const catalog = emptyDataset(context, source).catalog;
  catalog.groups.push(
    { ...base, type: "plants.series", memberIds: null },
    { ...base, id: 2, type: "plants.series", memberIds: [] },
  );
  const result = CatalogSchema.parse(catalog);
  expect(result.groups.map((group) => group.memberIds)).toEqual([null, []]);
});
test("all nested image references use the same traversal and asset coverage check", () => {
  const dataset = emptyDataset(context, source);
  const image = { assetId: "source-image", variant: "icon" as const };
  dataset.catalog.items.push({ ...base, type: "reference", image });
  expect(referencedImages(dataset)).toEqual([image]);
  expect(() =>
    parseRelease({
      manifest: {
        ...context,
        source,
        files: ["catalog", "neighbors", "world", "assets"].map((kind) => ({
          kind,
          path: kind === "assets" ? "assets.json" : `zh-CN/${kind}.json`,
          sha256: "b".repeat(64),
          bytes: 1,
        })),
      },
      dataset,
      assets: { ...context, kind: "assets", images: [] },
    }),
  ).toThrow("Missing image");
});
