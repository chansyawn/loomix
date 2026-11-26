import { orderFlowerHybridizationRows } from "./flower-hybridization-order";
import type { FlowerHybridizationSeries } from "./model";

export const flowerCardHeight = 54;
export const flowerCardMaxWidth = 190;

const padding = 14;
const flowerGap = 12;
const recipeGap = 10;
const junctionRadius = 10;
const referenceOffset = 24;
const referenceSpan = referenceOffset + flowerCardMaxWidth;
const verticalGap = 28;

type Point = { x: number; y: number };
type FlowerNode = { id: number; generation: number; centerX: number; y: number };
type Recipe = FlowerHybridizationSeries["recipes"][number];
type Route = {
  parentIds: number[];
  referenceIds: number[];
};

function flowerGenerations(orderedIds: number[], recipesByProduct: ReadonlyMap<number, Recipe[]>) {
  const generations = new Map<number, number>();
  const pending = new Set(orderedIds);
  while (pending.size) {
    const before = pending.size;
    for (const id of pending) {
      const parents = (recipesByProduct.get(id) ?? []).flatMap((recipe) => recipe.parentItemIds);
      if (parents.some((parent) => !generations.has(parent))) continue;
      generations.set(id, Math.max(-1, ...parents.map((parent) => generations.get(parent)!)) + 1);
      pending.delete(id);
    }
    if (before === pending.size) return new Map(orderedIds.map((id) => [id, 0]));
  }
  return generations;
}

function flowerSlot(id: number, routes: Route[]) {
  const junctionXs: number[] = [];
  let end = 0;
  for (const { referenceIds } of routes) {
    const junctionX = end + (referenceIds.length === 2 ? referenceSpan : junctionRadius);
    junctionXs.push(junctionX);
    end = junctionX + (referenceIds.length ? referenceSpan : junctionRadius) + recipeGap;
  }
  const center = junctionXs.length ? (junctionXs[0] + junctionXs.at(-1)!) / 2 : 0;
  const left = Math.min(0, center - flowerCardMaxWidth / 2);
  const right = Math.max(end - recipeGap, center + flowerCardMaxWidth / 2);
  return {
    id,
    routes,
    width: right - left,
    center: center - left,
    junctionXs: junctionXs.map((x) => x - left),
  };
}

function curveDownTo(start: Point, end: Point) {
  const middleY = (start.y + end.y) / 2;
  return `C ${start.x} ${middleY} ${end.x} ${middleY} ${end.x} ${end.y}`;
}

export function flowerHybridizationLayout({ members, recipes }: FlowerHybridizationSeries) {
  if (!recipes.length) return null;

  const recipesByProduct = new Map<number, Recipe[]>();
  const linkedIds = new Set<number>();
  for (const recipe of recipes) {
    const id = recipe.productItemId;
    recipesByProduct.set(id, [...(recipesByProduct.get(id) ?? []), recipe]);
    linkedIds.add(id);
    for (const parent of recipe.parentItemIds) linkedIds.add(parent);
  }
  const orderedIds = [...new Set(members.map(({ id }) => id).filter((id) => linkedIds.has(id)))];
  if (orderedIds.length !== linkedIds.size) return null;

  const generations = flowerGenerations(orderedIds, recipesByProduct);
  const generationCount = Math.max(...generations.values()) + 1;
  const rows = Array.from({ length: generationCount }, () => [] as ReturnType<typeof flowerSlot>[]);
  for (const id of orderedIds) {
    const generation = generations.get(id)!;
    const routes = (recipesByProduct.get(id) ?? []).map(({ parentItemIds }) => {
      const parents = [...new Set(parentItemIds)];
      const parentIds = parents.filter((parentId) => generations.get(parentId) === generation - 1);
      const referenceIds = parents.filter((parentId) => !parentIds.includes(parentId));
      return { parentIds, referenceIds };
    });
    rows[generation].push(flowerSlot(id, routes));
  }

  const rowWidths = rows.map((row) =>
    row.reduce((total, slot) => total + slot.width + flowerGap, -flowerGap),
  );
  const width = Math.max(...rowWidths);
  const nodes = new Map<number, FlowerNode>();
  const links = [];
  let y = padding;
  for (const [generation, row] of orderFlowerHybridizationRows(rows).entries()) {
    const routes = row.flatMap((slot) => slot.routes);
    const clearance = routes.some(({ referenceIds }) => referenceIds.length)
      ? flowerCardHeight / 2 + 2
      : 0;
    const junctionY = y + verticalGap + clearance;
    if (routes.length) y = junctionY + verticalGap + clearance;

    let x = padding + (width - rowWidths[generation]) / 2;
    for (const slot of row) {
      const centerX = x + slot.center;
      nodes.set(slot.id, { id: slot.id, generation, centerX, y });
      for (const [index, { parentIds, referenceIds }] of slot.routes.entries()) {
        const junction = { x: x + slot.junctionXs[index], y: junctionY };
        const productX =
          centerX + (index - (slot.routes.length - 1) / 2) * Math.min(10, 20 / slot.routes.length);
        const references = referenceIds.map((id, referenceIndex) => ({
          id,
          edgeX:
            junction.x +
            (referenceIds.length === 2 && referenceIndex === 0
              ? -referenceOffset
              : referenceOffset),
        }));
        const inputs = parentIds.map((id) => {
          const source = nodes.get(id)!;
          const start = { x: source.centerX, y: source.y + flowerCardHeight };
          const end = { x: junction.x, y: junction.y - clearance };
          return {
            id,
            path: `M ${start.x} ${start.y} ${curveDownTo(start, end)} V ${junction.y}`,
          };
        });
        const outputStart = { x: junction.x, y: junction.y + clearance };
        links.push({
          productId: slot.id,
          junction,
          inputs,
          references,
          label: parentIds.length + referenceIds.length === 1 ? "×2" : "＋",
          referenceStem: references.length
            ? references.map(({ edgeX }) => `M ${junction.x} ${junction.y} H ${edgeX}`).join(" ")
            : null,
          outputPath: `M ${junction.x} ${junction.y} V ${outputStart.y} ${curveDownTo(outputStart, { x: productX, y: y - 2 })}`,
        });
      }
      x += slot.width + flowerGap;
    }
    y += flowerCardHeight;
  }

  return { width: width + 2 * padding, height: y + padding, nodes: [...nodes.values()], links };
}
