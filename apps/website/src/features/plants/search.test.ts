import { describe, expect, it } from "vite-plus/test";
import { emptyQuery, plantsSearchSchema, updateViewQuery } from "./search";

describe("plant URL state", () => {
  it("restores defaults for missing or malformed view objects", () => {
    const defaults = { view: "items", items: emptyQuery(), series: emptyQuery() };
    expect(plantsSearchSchema.parse({})).toEqual(defaults);
    for (const value of [null, [], "invalid", 42, true])
      expect(plantsSearchSchema.parse({ view: "invalid", items: value, series: value })).toEqual(
        defaults,
      );
  });

  it("normalizes malformed values while preserving dynamic filter choices", () => {
    expect(
      plantsSearchSchema.parse({
        items: {
          q: 12,
          sort: "toString",
          categories: ["作物", "未见分类", "作物"],
          galaxies: ["禾夏", "禾夏", false],
          harvestCounts: ["2", "-1", "02", "__missing", 3],
          qualities: ["0", "9", "__missing", "0"],
        },
        series: {
          qualities: ["4", "invalid"],
          galaxies: ["禾夏"],
          sources: ["采集", "采集", false],
          flowerColors: ["白色", "白色", 3],
        },
      }),
    ).toEqual({
      view: "items",
      items: {
        ...emptyQuery(),
        categories: ["作物", "未见分类"],
        galaxies: ["禾夏"],
        harvestCounts: ["2", "__missing"],
        qualities: ["0", "__missing"],
      },
      series: { ...emptyQuery(), qualities: ["4"], sources: ["采集"], flowerColors: ["白色"] },
    });
  });

  it("keeps independent view state and drops unsupported series filters", () => {
    const search = plantsSearchSchema.parse({
      view: "series",
      items: { q: "花", galaxies: ["禾夏"] },
      series: { q: "春", qualities: ["1"], categories: ["作物"] },
    });
    expect(search.series).toEqual({ ...emptyQuery(), q: "春", qualities: ["1"] });
    const updated = updateViewQuery(search, { q: "星屿" });
    expect(updated.series.q).toBe("星屿");
    expect(updated.items).toEqual(search.items);
    expect(plantsSearchSchema.parse(JSON.parse(JSON.stringify(updated)))).toEqual(updated);
  });
});
