import { describe, expect, it } from "vite-plus/test";
import { creaturesSearchSchema, emptyQuery, updateViewQuery } from "./search";

describe("creature URL state", () => {
  it("restores defaults for missing or malformed view objects", () => {
    const defaults = { view: "items", items: emptyQuery(), series: emptyQuery() };
    expect(creaturesSearchSchema.parse({})).toEqual(defaults);
    for (const value of [null, [], "invalid", 42, true])
      expect(creaturesSearchSchema.parse({ view: "invalid", items: value, series: value })).toEqual(
        defaults,
      );
  });
  it("normalizes invalid fields without discarding valid choices", () => {
    expect(
      creaturesSearchSchema.parse({
        items: {
          q: 12,
          sort: "toString",
          categories: ["水生生物", "invalid", "水生生物"],
          seasons: ["春季", "invalid", "全年"],
          times: ["白天", "invalid"],
          weather: ["雨天", "任意天气", false],
          qualities: ["0", "9", "__missing", "0"],
          habitats: "河流",
          regions: ["禾夏", 1, "", "禾夏"],
        },
      }).items,
    ).toEqual({
      ...emptyQuery(),
      categories: ["水生生物"],
      seasons: ["春季", "全年"],
      times: ["白天"],
      weather: ["雨天", "任意天气"],
      qualities: ["0", "__missing"],
      regions: ["禾夏"],
    });
  });
  it("keeps independent queries and strips unsupported series filters", () => {
    const state = creaturesSearchSchema.parse({
      view: "series",
      items: { q: "鱼", seasons: ["冬季"] },
      series: { q: "春", qualities: ["1"], regions: ["禾夏"], page: 2 },
    });
    expect(state.series).toEqual({ ...emptyQuery(), q: "春", qualities: ["1"] });
    const updated = updateViewQuery(state, { q: "星屿" });
    expect(updated.series.q).toBe("星屿");
    expect(updated.items).toEqual(state.items);
    expect(creaturesSearchSchema.parse(JSON.parse(JSON.stringify(updated)))).toEqual(updated);
  });
});
