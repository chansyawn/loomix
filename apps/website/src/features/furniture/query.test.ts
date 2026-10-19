import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { parseContent } from "@petit-orbit/content-schema";
import {
  emptyQuery,
  filterGroups,
  membershipIndex,
  missing,
  parseFurnitureSearch,
  queryFurniture,
  ungrouped,
  updateViewQuery,
} from "./query";

const data = parseContent(
  JSON.parse(
    readFileSync(new URL("../../../public/resources/content.json", import.meta.url), "utf8"),
  ),
).furniture;

describe("furniture catalog", () => {
  it("paginates the real catalog without changing resource order", () => {
    const result = queryFurniture(data, "items", emptyQuery());
    expect(result.total).toBe(887);
    expect(result.rows).toEqual(data.items.slice(0, 48));
    expect(queryFurniture(data, "sets", emptyQuery()).rows).toEqual(data.sets.slice(0, 12));
    const last = queryFurniture(data, "items", { ...emptyQuery(), page: 999 });
    expect(last.page).toBe(last.pages);
    expect(last.rows.length).toBeGreaterThan(0);
  });

  it("combines choices within a group with OR and different groups with AND", () => {
    const query = {
      ...emptyQuery(),
      colors: ["白色", "黄色"],
      materials: ["木制"],
      categories: ["起居", "装饰物"],
    };
    const result = queryFurniture(data, "items", query);
    const expected = data.items.filter(
      (item) =>
        ["起居", "装饰物"].includes(item.category ?? "") &&
        item.materials?.split("，").includes("木制") &&
        item.colors?.split("，").some((color) => ["白色", "黄色"].includes(color)),
    );
    expect(result.total).toBe(expected.length);
    expect(result.rows).toEqual(expected.slice(0, 48));
  });

  it("searches names and matches sources as complete text", () => {
    expect(
      queryFurniture(data, "items", { ...emptyQuery(), q: "  手工图桌  " }).rows.map(
        (row) => row.name,
      ),
    ).toEqual(["手工图桌"]);
    expect(queryFurniture(data, "items", { ...emptyQuery(), sources: ["格连商店"] }).total).toBe(0);
    expect(
      queryFurniture(data, "items", { ...emptyQuery(), sources: ["格连商店购买"] }).total,
    ).toBeGreaterThan(0);
    expect(queryFurniture(data, "items", { ...emptyQuery(), q: "不存在的家具名称" }).rows).toEqual(
      [],
    );
  });

  it("finds set members and ungrouped furniture through member IDs", () => {
    const set = data.sets[0];
    const result = queryFurniture(data, "items", { ...emptyQuery(), sets: [String(set.id)] });
    expect(result.rows.map((row) => row.id)).toEqual(
      data.items.filter((item) => set.componentIds?.includes(item.id)).map((item) => item.id),
    );
    expect(queryFurniture(data, "items", { ...emptyQuery(), sets: [ungrouped] }).total).toBe(415);
    expect(
      membershipIndex(data.sets)
        .get(set.componentIds![0])
        ?.map((row) => row.id),
    ).toContain(set.id);
  });

  it("makes missing attributes filterable and keeps category and type options independent", () => {
    const result = queryFurniture(data, "items", { ...emptyQuery(), colors: [missing] });
    expect(result.total).toBe(data.items.filter((item) => item.colors === null).length);
    expect(filterGroups(data).find((group) => group.key === "colors")?.options).toContainEqual({
      value: missing,
      label: "未提供",
    });
    const categoryGroup = filterGroups(data).find((group) => group.key === "categories")!;
    expect(categoryGroup.options.map((option) => option.value)).toEqual([
      "起居",
      "装饰物",
      "功能家具",
      "硬装",
      "绿植",
      "户外布设",
      "其他",
    ]);
    const types = filterGroups(data).find((group) => group.key === "types")!.options;
    expect(
      types.every((option) => data.items.some((item) => (item.type ?? missing) === option.value)),
    ).toBe(true);
  });

  it("sorts quality in either direction while retaining stable ties", () => {
    const descending = queryFurniture(data, "items", { ...emptyQuery(), sort: "quality-desc" });
    expect(descending.rows[0].quality).toBe(4);
    const ascending = queryFurniture(data, "items", { ...emptyQuery(), sort: "quality-asc" });
    expect(ascending.rows[0].quality).toBe(0);
    expect(data.items[0].name).toBe("手工图桌");
  });
});

describe("furniture URL state", () => {
  it("restores separate views through a JSON round trip", () => {
    const search = parseFurnitureSearch({
      view: "sets",
      items: { q: "桌", page: 3, colors: ["黄色"] },
      sets: { qualities: ["2"], page: 2 },
    });
    expect(parseFurnitureSearch(JSON.parse(JSON.stringify(search)))).toEqual(search);
    const updated = updateViewQuery(search, { q: "麦田" });
    expect(updated.sets.page).toBe(1);
    expect(updated.items).toEqual(search.items);
    expect(updateViewQuery(updated, { page: 2 }).sets.page).toBe(2);
  });

  it("updates categories without clearing types and resets the page", () => {
    const search = parseFurnitureSearch({
      items: { page: 4, types: ["基础家具·桌"] },
    });
    const updated = updateViewQuery(search, { categories: ["起居", "装饰物"] });
    expect(updated.items.categories).toEqual(["起居", "装饰物"]);
    expect(updated.items.types).toEqual(["基础家具·桌"]);
    expect(updated.items.page).toBe(1);
  });

  it("normalizes malformed URL input and strips unsupported set filters", () => {
    const state = parseFurnitureSearch({
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
    expect(state.items.page).toBe(1);
    expect(state.items.categories).toEqual(["起居"]);
    expect(state.items.sort).toBe("original");
    expect(state.items.colors).toEqual(["白色"]);
    expect(state.items.qualities).toEqual(["0"]);
    expect(state.sets.types).toEqual([]);
    expect(state.sets.categories).toEqual([]);
    expect(state.sets.page).toBe(1);
  });
});
