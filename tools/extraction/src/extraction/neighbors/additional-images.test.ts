import { expect, test } from "vite-plus/test";
import type { IndexedAsset } from "../types.ts";
import {
  additionalNeighborImageSelections,
  parseAdditionalNeighborImageSelections,
  selectAdditionalNeighborImages,
} from "./additional-images.ts";

const selections = additionalNeighborImageSelections();
const indexed = selections.map((selection): IndexedAsset => ({
  Name: selection.resourceName,
  Container: selection.container,
  Type: selection.assetType,
  Source: selection.source,
  PathID: selection.pathId,
}));
const textures = indexed.filter((asset) => asset.Type === "Texture2D");
const sprites = indexed.filter((asset) => asset.Type === "Sprite");

test("只保留网站展示的好感图与角色图，且每位友邻至多一张", () => {
  expect(selections.filter((selection) => selection.category === "role")).toHaveLength(12);
  expect(selections.filter((selection) => selection.category === "favour")).toHaveLength(11);
  const keys = selections.map((selection) => `${selection.category}:${selection.npcId}`);
  expect(new Set(keys).size).toBe(keys.length);
});

test("按冻结的资源身份精确选择", () => {
  const selected = selectAdditionalNeighborImages(textures, sprites);
  expect(selected.map((asset) => asset.resourceName)).toEqual(
    selections.map((selection) => selection.resourceName),
  );
});

test("资源缺失、重复或身份变化时报错", () => {
  const source = textures.length ? textures : sprites;
  const target = source[0]!;
  const select = (entries: IndexedAsset[]) =>
    target.Type === "Texture2D"
      ? selectAdditionalNeighborImages(entries, sprites)
      : selectAdditionalNeighborImages(textures, entries);
  const error = "Additional neighbor image index identity changed";
  expect(() => select(source.slice(1))).toThrow(error);
  expect(() => select([...source, target])).toThrow(error);
  for (const field of ["Type", "Name", "Container", "Source", "PathID"] as const)
    expect(() => select([{ ...target, [field]: "changed" }, ...source.slice(1)])).toThrow(error);
});

test("清单要求归属友邻、资源名唯一且有序，并忽略白名单外友邻", () => {
  const entry = selections[0]!;
  expect(() => parseAdditionalNeighborImageSelections([{ ...entry, npcId: null }])).toThrow();
  expect(() => parseAdditionalNeighborImageSelections([{ ...entry, category: "card" }])).toThrow();
  expect(() => parseAdditionalNeighborImageSelections([entry, entry])).toThrow(
    "Additional image resource names must be unique",
  );
  expect(() => parseAdditionalNeighborImageSelections([selections[1], entry])).toThrow(
    "Additional image selections must be sorted by resource name",
  );
  expect(parseAdditionalNeighborImageSelections([{ ...entry, npcId: 1014 }])).toEqual([]);
});
