import { describe, expect, it } from "vite-plus/test";
import { emptyQuery, plantsSearchSchema, updateViewQuery } from "./search";

describe("plant URL state", () => {
  it("restores defaults for missing or malformed view objects", () => {
    const defaults = {
      view: "items",
      items: emptyQuery(),
      series: emptyQuery(),
      seeds: emptyQuery(),
    };
    expect(plantsSearchSchema.parse({})).toEqual(defaults);
    for (const value of [null, [], "invalid", 42, true])
      expect(
        plantsSearchSchema.parse({
          view: "invalid",
          items: value,
          series: value,
          seeds: value,
        }),
      ).toEqual(defaults);
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
        seeds: {
          sort: "quality-desc",
          categories: ["作物"],
          sources: ["格连商店购买"],
          series: ["95000"],
          harvestCounts: ["3", "-1", "__missing"],
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
      seeds: {
        ...emptyQuery(),
        sources: ["格连商店购买"],
        series: ["95000"],
        harvestCounts: ["3", "__missing"],
      },
    });
  });

  it("keeps independent view state and drops unsupported filters", () => {
    const search = plantsSearchSchema.parse({
      view: "series",
      items: { q: "花", galaxies: ["禾夏"] },
      series: { q: "春", qualities: ["1"], categories: ["作物"] },
      seeds: { q: "种子", sources: ["星屿探索"], qualities: ["2"] },
    });
    expect(search.series).toEqual({ ...emptyQuery(), q: "春", qualities: ["1"] });
    expect(search.seeds).toEqual({
      ...emptyQuery(),
      q: "种子",
      sources: ["星屿探索"],
    });
    const updated = updateViewQuery(search, { q: "星屿" });
    expect(updated.series.q).toBe("星屿");
    expect(updated.items).toEqual(search.items);
    expect(updated.seeds).toEqual(search.seeds);
    expect(plantsSearchSchema.parse(JSON.parse(JSON.stringify(updated)))).toEqual(updated);
  });

  it("updates the seed view without changing the other views", () => {
    const search = plantsSearchSchema.parse({ view: "seeds", seeds: { q: "番茄" } });
    const updated = updateViewQuery(search, { harvestCounts: ["3"] });
    expect(updated.seeds).toMatchObject({ q: "番茄", harvestCounts: ["3"] });
    expect(updated.items).toEqual(search.items);
    expect(updated.series).toEqual(search.series);
  });
});
