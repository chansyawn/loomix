import { describe, expect, it } from "vite-plus/test";
import { emptyQuery, furnitureSearchSchema, updateViewQuery } from "./search";

describe("furniture URL state", () => {
  it("defaults to cards and validates the shared layout independently of content views", () => {
    for (const layout of [undefined, null, "bad", [], 42])
      expect(furnitureSearchSchema.parse({ layout }).layout).toBe("grid");
    const search = furnitureSearchSchema.parse({
      layout: "table",
      view: "sets",
      items: { q: "桌", colors: ["黄色"] },
      sets: { qualities: ["2"] },
    });
    expect(updateViewQuery(search, { q: "麦田" })).toEqual({
      ...search,
      sets: { ...search.sets, q: "麦田" },
    });
    expect(furnitureSearchSchema.parse(JSON.parse(JSON.stringify(search)))).toEqual(search);
  });

  it("ignores obsolete page parameters in both views", () => {
    const search = furnitureSearchSchema.parse({ items: { page: 8 }, sets: { page: 3 } });
    expect(search.items).toEqual(emptyQuery());
    expect(search.sets).toEqual(emptyQuery());
  });

  it("restores separate views through a JSON round trip", () => {
    const search = furnitureSearchSchema.parse({
      view: "sets",
      items: { q: "桌", page: 3, colors: ["黄色"] },
      sets: { qualities: ["2"], page: 2 },
    });
    expect(furnitureSearchSchema.parse(JSON.parse(JSON.stringify(search)))).toEqual(search);
    const updated = updateViewQuery(search, { q: "麦田" });
    expect(updated.sets.q).toBe("麦田");
    expect(updated.items).toEqual(search.items);
  });

  it("updates categories without clearing types", () => {
    const search = furnitureSearchSchema.parse({
      items: { page: 4, types: ["基础家具·桌"] },
    });
    const updated = updateViewQuery(search, { categories: ["起居", "装饰物"] });
    expect(updated.items.categories).toEqual(["起居", "装饰物"]);
    expect(updated.items.types).toEqual(["基础家具·桌"]);
  });

  it("normalizes malformed URL input and strips unsupported set filters", () => {
    const state = furnitureSearchSchema.parse({
      view: "bad",
      items: {
        page: -2,
        category: "未知",
        categories: ["起居", "起居", "未知"],
        sort: "toString",
        colors: ["白色", null, "白色"],
        qualities: ["9", "0"],
      },
      sets: { types: ["基础家具·床"], page: Infinity },
    });
    expect(state.view).toBe("items");
    expect(state.items.categories).toEqual(["起居"]);
    expect(state.items.sort).toBe("original");
    expect(state.items.colors).toEqual(["白色"]);
    expect(state.items.qualities).toEqual(["0"]);
    expect(state.sets.types).toEqual([]);
    expect(state.sets.categories).toEqual([]);
  });
});

describe("search parameter validation", () => {
  it("restores complete defaults for missing or malformed view objects", () => {
    const defaults = { view: "items", layout: "grid", items: emptyQuery(), sets: emptyQuery() };
    expect(furnitureSearchSchema.parse({})).toEqual(defaults);
    for (const value of [null, [], "bad", 42, true]) {
      expect(furnitureSearchSchema.parse({ items: value, sets: value })).toEqual(defaults);
    }
  });

  it("falls back per field and preserves valid members of mixed arrays", () => {
    const search = furnitureSearchSchema.parse({
      items: {
        q: 1,
        sort: "unknown",
        colors: ["白色", null, "", 1, "白色", "黄色"],
        materials: "木制",
        qualities: ["0", "9", null, "__missing", "0", 2],
        sets: ["123", "__ungrouped"],
      },
      sets: { q: "麦田", qualities: ["2", false, "3"], colors: ["白色"] },
    });
    expect(search.items).toEqual({
      ...emptyQuery(),
      colors: ["白色", "黄色"],
      qualities: ["0", "__missing"],
      sets: ["123", "__ungrouped"],
    });
    expect(search.sets).toEqual({ ...emptyQuery(), q: "麦田", qualities: ["2", "3"] });
  });

  it("uses legacy category only when categories is not an array", () => {
    for (const categories of [undefined, null, "invalid"]) {
      expect(
        furnitureSearchSchema.parse({ items: { category: "起居", categories } }).items.categories,
      ).toEqual(["起居"]);
    }
    expect(
      furnitureSearchSchema.parse({ items: { category: "起居", categories: [] } }).items.categories,
    ).toEqual([]);
    expect(
      furnitureSearchSchema.parse({
        items: { category: "起居", categories: ["装饰物", "未知", "装饰物"] },
      }).items.categories,
    ).toEqual(["装饰物"]);
  });
});
