import { expect, test } from "vite-plus/test";
import { createImageResolver } from "@loomix/schema/assets";
import { neighborFixture } from "./fixture";
import { queryNeighbors } from "./query";
import { toNeighborsView } from "./view";

function view() {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  return toNeighborsView(database, createImageResolver(mapping), catalog, gameplayTags);
}

test("只匹配友邻显示名称及其拼音", () => {
  const data = view();
  for (const q of ["幻雪", "huanxue", "hx"]) {
    expect(queryNeighbors(data, { q, galaxy: "" }).map((neighbor) => neighbor.id)).toEqual([2]);
  }
  for (const q of ["manna", "咪朵", "图塔的星球"]) {
    expect(queryNeighbors(data, { q, galaxy: "" })).toEqual([]);
  }
});

test("keeps galaxy filtering and ignores blank queries", () => {
  const data = view();
  expect(queryNeighbors(data, { q: " ", galaxy: "" })).toHaveLength(4);
  expect(queryNeighbors(data, { q: "", galaxy: "禾夏" }).map((neighbor) => neighbor.id)).toEqual([
    1, 2,
  ]);
  expect(queryNeighbors(data, { q: "huanxue", galaxy: "帕沙" })).toEqual([]);
});
