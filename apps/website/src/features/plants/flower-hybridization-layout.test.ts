import { expect, test } from "vite-plus/test";
import {
  flowerCardHeight,
  flowerCardMaxWidth,
  flowerHybridizationLayout,
} from "./flower-hybridization-layout";
import type { FlowerHybridizationSeries } from "./model";

const series: FlowerHybridizationSeries = {
  id: 10,
  name: "系列",
  members: [1, 2, 3, 4, 5].map((id) => ({ id, name: `花 ${id}`, image: null })),
  recipes: [
    { parentItemIds: [1, 2], productItemId: 3 },
    { parentItemIds: [1, 1], productItemId: 3 },
    { parentItemIds: [2, 3], productItemId: 4 },
    { parentItemIds: [1, 2], productItemId: 4 },
  ],
};

test("花卉按世代从上往下排列，跨代亲本显示在加号侧边", () => {
  const layout = flowerHybridizationLayout(series)!;
  expect(flowerHybridizationLayout(series)).toEqual(layout);
  expect(layout.nodes.map(({ id, generation }) => [id, generation])).toEqual([
    [2, 0],
    [1, 0],
    [3, 1],
    [4, 2],
  ]);
  expect(
    layout.links.map(({ productId, label, inputs, references }) => ({
      productId,
      label,
      inputs: inputs.map(({ id }) => id),
      references: references.map(({ id }) => id),
    })),
  ).toEqual([
    { productId: 3, label: "＋", inputs: [1, 2], references: [] },
    { productId: 3, label: "×2", inputs: [1], references: [] },
    { productId: 4, label: "＋", inputs: [3], references: [2] },
    { productId: 4, label: "＋", inputs: [], references: [1, 2] },
  ]);
  expect(new Set(layout.links.map(({ outputPath }) => outputPath)).size).toBe(
    series.recipes.length,
  );
  for (const {
    productId,
    inputs,
    junction,
    references,
    referenceStem,
    outputPath,
  } of layout.links) {
    const target = layout.nodes.find(({ id }) => id === productId)!;
    expect(junction.y).toBeLessThan(target.y);
    expect(outputPath).toMatch(new RegExp(` C .* [\\d.]+ ${target.y - 2}$`));
    for (const { id, path } of inputs) {
      const parent = layout.nodes.find((node) => node.id === id)!;
      expect(parent.generation + 1).toBe(target.generation);
      expect(parent.y + flowerCardHeight).toBeLessThan(junction.y);
      expect(path).toMatch(
        new RegExp(
          `^M ${parent.centerX} ${parent.y + flowerCardHeight} C .* ${junction.x} [\\d.]+ V ${junction.y}$`,
        ),
      );
    }
    if (references.length === 2) {
      expect(references[0].edgeX).toBeLessThan(junction.x);
      expect(references[1].edgeX).toBeGreaterThan(junction.x);
    }
    expect(referenceStem).toBe(
      references.length
        ? references.map(({ edgeX }) => `M ${junction.x} ${junction.y} H ${edgeX}`).join(" ")
        : null,
    );
  }
});

test("共同亲本居中，避免百子莲两条配方的连线交叉", () => {
  const layout = flowerHybridizationLayout({
    id: 95112,
    name: "百子莲",
    members: [52046, 52049, 52052, 56231, 56232, 56233, 56234].map((id) => ({
      id,
      name: String(id),
      image: null,
    })),
    recipes: [
      { parentItemIds: [52046, 52052], productItemId: 56231 },
      { parentItemIds: [52049, 52052], productItemId: 56232 },
      { parentItemIds: [52052, 56231], productItemId: 56233 },
      { parentItemIds: [52049, 56232], productItemId: 56234 },
    ],
  })!;
  expect(layout.nodes.map(({ id }) => id)).toEqual([
    52046, 52052, 52049, 56231, 56232, 56233, 56234,
  ]);
});

test("联合调整多代顺序，避免只交换一代时无法消除的交叉", () => {
  const layout = flowerHybridizationLayout({
    ...series,
    members: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
      id,
      name: String(id),
      image: null,
    })),
    recipes: [
      { parentItemIds: [1, 1], productItemId: 4 },
      { parentItemIds: [2, 2], productItemId: 5 },
      { parentItemIds: [3, 3], productItemId: 6 },
      { parentItemIds: [4, 6], productItemId: 7 },
      { parentItemIds: [5, 6], productItemId: 8 },
    ],
  })!;
  expect(layout.nodes.map(({ id }) => id)).toEqual([1, 3, 2, 4, 6, 5, 7, 8]);
});

test("超过四张卡片的一代仍通过相邻换位减少交叉", () => {
  const input: FlowerHybridizationSeries = {
    ...series,
    members: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
      id,
      name: String(id),
      image: null,
    })),
    recipes: [
      { parentItemIds: [1, 3], productItemId: 6 },
      { parentItemIds: [2, 3], productItemId: 7 },
      { parentItemIds: [4, 5], productItemId: 8 },
    ],
  };
  const layout = flowerHybridizationLayout(input)!;
  expect(layout.nodes.map(({ id }) => id)).toEqual([1, 3, 2, 4, 5, 6, 7, 8]);
  expect(flowerHybridizationLayout(input)).toEqual(layout);
});

test("标签与花卉节点互不遮挡，共享产物的配方各自占据空间", () => {
  const layout = flowerHybridizationLayout(series)!;
  const rectangles = [
    ...layout.nodes.map(({ centerX, y }) => ({ x: centerX - flowerCardMaxWidth / 2, y })),
    ...layout.links.flatMap(({ junction, references }) =>
      references.map(({ edgeX }) => ({
        x: edgeX < junction.x ? edgeX - flowerCardMaxWidth : edgeX,
        y: junction.y - flowerCardHeight / 2,
      })),
    ),
  ];
  for (const [index, box] of rectangles.entries()) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + flowerCardMaxWidth).toBeLessThanOrEqual(layout.width);
    expect(box.y + flowerCardHeight).toBeLessThanOrEqual(layout.height);
    for (const other of rectangles.slice(index + 1)) {
      expect(
        box.x + flowerCardMaxWidth <= other.x ||
          other.x + flowerCardMaxWidth <= box.x ||
          box.y + flowerCardHeight <= other.y ||
          other.y + flowerCardHeight <= box.y,
      ).toBe(true);
    }
  }
});

test("多条配方的连线落在产物卡片内", () => {
  const layout = flowerHybridizationLayout({
    ...series,
    recipes: [
      ...series.recipes,
      { parentItemIds: [1, 3], productItemId: 4 },
      { parentItemIds: [2, 2], productItemId: 4 },
    ],
  })!;
  const product = layout.nodes.find(({ id }) => id === 4)!;
  const ports = layout.links
    .filter(({ productId }) => productId === product.id)
    .map(({ outputPath }) => Number(outputPath.split(" ").at(-2)));
  expect(new Set(ports).size).toBe(4);
  for (const port of ports) {
    expect(Math.abs(port - product.centerX)).toBeLessThan(10);
  }
});

test("存在循环时用亲本标签保留每条配方", () => {
  const recipes: FlowerHybridizationSeries["recipes"] = [
    ...series.recipes,
    { parentItemIds: [4, 4], productItemId: 1 },
  ];
  const layout = flowerHybridizationLayout({ ...series, recipes })!;
  expect(layout.links).toHaveLength(recipes.length);
  expect(layout.links.every(({ inputs }) => inputs.length === 0)).toBe(true);
  expect(layout.links.find(({ productId }) => productId === 1)).toMatchObject({
    references: [{ id: 4 }],
    label: "×2",
  });
});
