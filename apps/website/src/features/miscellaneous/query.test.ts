import type { MiscellaneousItem } from "../omnidex-view.ts";
import { describe, expect, it } from "vite-plus/test";
import type { MiscellaneousData } from "./data";
import { filterGroups, queryMiscellaneous } from "./query";
import { emptyQuery, missing } from "./search";

const first: MiscellaneousItem = {
  id: 1,
  name: "银杏木",
  image: null,
  description: "可以用于打造家具。",
  quality: 1,
  acquisition: "伐木",
};
const second: MiscellaneousItem = {
  ...first,
  id: 2,
  name: "碎贝壳",
  description: "海岸边捡到的材料。",
  quality: 0,
};
const third: MiscellaneousItem = {
  ...first,
  id: 3,
  name: "未知物品",
  description: null,
  quality: null,
};
const data: MiscellaneousData = [first, second, third];

describe("miscellaneous queries", () => {
  it("只搜索杂物的名称，并与品阶筛选取交集", () => {
    const result = queryMiscellaneous(data, { ...emptyQuery(), q: "yinxingmu", qualities: ["1"] });
    expect(result.rows.map((item) => item.id)).toEqual([1]);
    expect(
      queryMiscellaneous(data, { ...emptyQuery(), q: "贝壳" }).rows.map(({ id }) => id),
    ).toEqual([2]);
    for (const q of ["家具", "海岸", "hai an"]) {
      expect(queryMiscellaneous(data, { ...emptyQuery(), q }).rows).toEqual([]);
    }
    expect(
      queryMiscellaneous(data, { ...emptyQuery(), qualities: [missing] }).rows.map(
        (item) => item.id,
      ),
    ).toEqual([3]);
  });

  it("sorts without mutating source data and keeps missing quality last", () => {
    expect(
      queryMiscellaneous(data, { ...emptyQuery(), sort: "quality-desc" }).rows.map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3]);
    expect(
      queryMiscellaneous(data, { ...emptyQuery(), sort: "name-asc" }).rows.map((item) => item.id),
    ).toEqual([2, 3, 1]);
    expect(data).toEqual([first, second, third]);
  });

  it("offers available quality filters and missing quality only when present", () => {
    expect(filterGroups(data)[0]?.options).toContainEqual({ value: missing, label: "未提供" });
    expect(filterGroups([first, second])[0]?.options).not.toContainEqual({
      value: missing,
      label: "未提供",
    });
  });
});
