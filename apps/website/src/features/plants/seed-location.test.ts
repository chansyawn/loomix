import { expect, test } from "vite-plus/test";
import { seedLocation } from "./seed-location";
test("花树种子定位唯一植物，作物种子定位系列，并保留种子focus", () => {
  expect(seedLocation({ id: 1, cropSeriesId: null, plantIds: [50193] })).toEqual({
    to: "/collections/records/$id",
    params: { id: "50193" },
    search: { focus: 1 },
  });
  expect(seedLocation({ id: 1, cropSeriesId: 100, plantIds: [2, 3] })).toEqual({
    to: "/collections/records/$id",
    params: { id: "100" },
    search: { focus: 1 },
  });
});
test("独立植物目标不唯一时拒绝任取一个", () => {
  for (const plantIds of [[], [2, 3]])
    expect(() => seedLocation({ id: 1, cropSeriesId: null, plantIds })).toThrow(
      "Ambiguous seed destination",
    );
});
