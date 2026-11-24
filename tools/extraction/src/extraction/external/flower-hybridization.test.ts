import { expect, test } from "vite-plus/test";
import {
  collection,
  datasetFixture,
  plant,
  reference,
} from "../../../../../packages/schema/tests/fixture.ts";
import { flowerInputFixture } from "../fixtures/flower-hybridization.ts";
import { assembleFlowerHybridization, parseFlowerHybridization } from "./flower-hybridization.ts";

const { source, catalog } = datasetFixture();
catalog.items.push(
  ...[1, 2, 3, 4].map((id) => ({ ...plant(id), category: "花" })),
  plant(5),
  reference(6),
);
catalog.collections.push(collection(10, "plant", [1, 2, 3, 4, 5, 6]));
const recipe = { seriesId: 10, parentItemIds: [2, 1], productItemId: 3 };
const parse = (recipes: unknown[]) =>
  parseFlowerHybridization(
    Buffer.from(JSON.stringify(flowerInputFixture(source, recipes))),
    source,
  );

test("版本绑定和严格字段校验拒绝不可用的输入", () => {
  const parseInput = (input: unknown) =>
    parseFlowerHybridization(Buffer.from(JSON.stringify(input)), source);
  expect(() => parseInput(flowerInputFixture({ ...source, dataRevision: 0 }))).toThrow(
    "目标客户端",
  );
  expect(() => parseInput({ ...flowerInputFixture(source), sources: {} })).toThrow("sources");
  expect(() => parse([{ ...recipe, parentItemIds: [1] }])).toThrow("parentItemIds");
  expect(() => parse([{ ...recipe, productItemId: 0 }])).toThrow("productItemId");
  expect(() => parse([recipe, { ...recipe, parentItemIds: [1, 2] }])).toThrow("重复杂交配方");
});

test("组装保留同色亲本和多个可能产物，按 ID 排序并保留原记录位置", () => {
  const result = assembleFlowerHybridization(
    catalog,
    parse([{ ...recipe, productItemId: 4 }, recipe, { ...recipe, parentItemIds: [1, 1] }]),
  );
  expect(result.catalog.collections[0]?.flowerHybridization).toEqual([
    { parentItemIds: [1, 1], productItemId: 3 },
    { parentItemIds: [1, 2], productItemId: 3 },
    { parentItemIds: [1, 2], productItemId: 4 },
  ]);
  expect(
    result.fields[0]?.sources.map((proof) => proof.kind === "manual" && proof.pointer),
  ).toEqual(["/recipes/2", "/recipes/1", "/recipes/0"]);
  expect(
    assembleFlowerHybridization(catalog, parse([])).catalog.collections[0]?.flowerHybridization,
  ).toBeNull();
});

test("组装拒绝非花朵、仅供引用物品和跨系列配方", () => {
  for (const productItemId of [5, 6, 99])
    expect(() =>
      assembleFlowerHybridization(catalog, parse([{ ...recipe, productItemId }])),
    ).toThrow("正式花朵");
  const catalogWithoutMember = { ...catalog, collections: [collection(10, "plant", [1, 2])] };
  expect(() => assembleFlowerHybridization(catalogWithoutMember, parse([recipe]))).toThrow(
    "正式花朵",
  );
  expect(() => assembleFlowerHybridization(catalog, parse([{ ...recipe, seriesId: 11 }]))).toThrow(
    "未知植物系列",
  );
});
