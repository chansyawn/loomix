import { expect, test } from "vite-plus/test";
import { neighborFixture } from "./fixture";
import { queryNeighbors } from "./search";
import { toNeighborsView } from "./view";

function view() {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  return toNeighborsView(database, mapping, catalog, gameplayTags);
}

test("matches neighbor name, nickname, English name and star name", () => {
  const data = view();
  expect(queryNeighbors(data, { q: "manna", galaxy: "" }).map((neighbor) => neighbor.id)).toEqual([
    1,
  ]);
  expect(queryNeighbors(data, { q: "咪朵", galaxy: "" }).map((neighbor) => neighbor.id)).toEqual([
    2,
  ]);
  expect(queryNeighbors(data, { q: "幻雪", galaxy: "" }).map((neighbor) => neighbor.id)).toEqual([
    2,
  ]);
  expect(
    queryNeighbors(data, { q: "图塔的星球", galaxy: "" }).map((neighbor) => neighbor.id),
  ).toEqual([3]);
});

test("keeps galaxy filtering and ignores blank queries", () => {
  const data = view();
  expect(queryNeighbors(data, { q: " ", galaxy: "" })).toHaveLength(4);
  expect(queryNeighbors(data, { q: "", galaxy: "禾夏" }).map((neighbor) => neighbor.id)).toEqual([
    1, 2,
  ]);
  expect(queryNeighbors(data, { q: "manna", galaxy: "帕沙" })).toEqual([]);
});
