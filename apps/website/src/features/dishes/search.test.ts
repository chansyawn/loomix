import { describe, expect, it } from "vite-plus/test";
import { emptyQuery, dishesSearchSchema, updateViewQuery } from "./search";

describe("dish URL state", () => {
  it("restores defaults for missing and malformed view objects", () => {
    const defaults = { view: "items", items: emptyQuery(), series: emptyQuery() };
    expect(dishesSearchSchema.parse({})).toEqual(defaults);
    for (const value of [null, [], "invalid", 42, true])
      expect(dishesSearchSchema.parse({ view: "invalid", items: value, series: value })).toEqual(
        defaults,
      );
  });

  it("normalizes malformed filters while preserving dynamic choices", () => {
    expect(
      dishesSearchSchema.parse({
        items: {
          q: 12,
          sort: "toString",
          difficulties: ["简单", "未知", "简单"],
          difficultyRequirements: ["厨师等级 ≥ 5", "厨师等级 ≥ 5", false],
          tastes: ["甜", "咸", "甜"],
          galaxyFlavors: ["禾夏", false],
          cookwares: "bad",
          effects: ["耐力提升", "耐力提升"],
          qualities: ["0", "9", "__missing", "0"],
          series: ["100", "100", false],
        },
        series: { qualities: ["4", "invalid"], effects: ["ignored"] },
      }),
    ).toEqual({
      view: "items",
      items: {
        ...emptyQuery(),
        difficulties: ["简单", "未知"],
        difficultyRequirements: ["厨师等级 ≥ 5"],
        tastes: ["甜", "咸"],
        galaxyFlavors: ["禾夏"],
        effects: ["耐力提升"],
        qualities: ["0", "__missing"],
        series: ["100"],
      },
      series: { ...emptyQuery(), qualities: ["4"] },
    });
  });

  it("keeps independent view state and drops filters unsupported by series", () => {
    const search = dishesSearchSchema.parse({
      view: "series",
      items: { q: "烤鱼", cookwares: ["烤架"] },
      series: {
        q: "星露",
        qualities: ["1"],
        effects: ["ignored"],
        tastes: ["ignored"],
        difficultyRequirements: ["ignored"],
      },
    });
    expect(search.series).toEqual({ ...emptyQuery(), q: "星露", qualities: ["1"] });
    const updated = updateViewQuery(search, { q: "蒸鱼" });
    expect(updated.series.q).toBe("蒸鱼");
    expect(updated.items).toEqual(search.items);
    expect(dishesSearchSchema.parse(JSON.parse(JSON.stringify(updated)))).toEqual(updated);
  });
});
