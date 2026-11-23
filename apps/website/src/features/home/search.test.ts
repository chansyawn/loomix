import { describe, expect, it } from "vite-plus/test";
import { catalogSearchSchema, compactCatalogSearch } from "../catalog/search";
import { createHomeSearch } from "./search";

describe("首页搜索", () => {
  it("空输入不创建导航目标", () => {
    expect(createHomeSearch(" \n　")).toBeNull();
  });

  it("保留中文及特殊字符，裁剪空白并清空其他筛选", () => {
    const search = createHomeSearch("  麦田 & 花+草？  ");
    expect(search?.items.q).toBe("麦田 & 花+草？");
    expect(search?.items.tags).toEqual([]);
    expect(search?.items.categories).toEqual([]);
    expect(search?.layout).toBeUndefined();
    expect(
      catalogSearchSchema.parse(JSON.parse(JSON.stringify(compactCatalogSearch(search!)))),
    ).toEqual(search);
  });
});
