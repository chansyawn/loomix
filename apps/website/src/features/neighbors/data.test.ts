import { expect, test } from "vite-plus/test";
import { toNeighborsView } from "./data";
import { neighborFixture } from "./fixture";

test("derives neighbor relationships from their owning entities", () => {
  const { database, mapping } = neighborFixture();
  const view = toNeighborsView(database, mapping);
  expect(view.neighbors).toHaveLength(4);
  expect(view.neighbors[0].stories.map((story) => story.chapter)).toEqual([1, 2]);
  expect(view.neighbors[3].themes).toHaveLength(2);
  expect(view.neighbors[0].travel[0].reactions[0].text).toBe("旅行真开心！");
});
test("resolves image references through the common asset directory", () => {
  const { database, mapping } = neighborFixture();
  expect(toNeighborsView(database, mapping).neighbors[0].image).toBe(
    `assets/${"a".repeat(64)}.webp`,
  );
  expect(toNeighborsView(database, { ...mapping, images: [] }).neighbors[0].image).toBeNull();
});
