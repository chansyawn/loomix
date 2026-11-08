import { expect, test } from "vite-plus/test";
import { seedLocations } from "./seed-location";

test("flower and tree seeds navigate to their confirmed plants", () => {
  expect(seedLocations({ cropSeriesId: null, plantIds: [50193] })).toEqual([
    { to: "/collection/plants/items/$id", params: { id: "50193" } },
  ]);
});
test("crop seeds keep their series destination and multiple independent targets remain accessible", () => {
  expect(seedLocations({ cropSeriesId: 100, plantIds: [1, 2] })).toEqual([
    { to: "/collection/plants/series/$id", params: { id: "100" }, search: { tab: undefined } },
  ]);
  expect(
    seedLocations({ cropSeriesId: null, plantIds: [1, 2] }).map((location) => location.params.id),
  ).toEqual(["1", "2"]);
});
