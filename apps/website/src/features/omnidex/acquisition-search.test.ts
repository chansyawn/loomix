import { expect, test } from "vite-plus/test";
import { catalogSearchSchema, compactCatalogSearch } from "../catalog/search";
import { compactFurnitureSearch, furnitureSearchSchema } from "../furniture/search";
import { clothingSearchSchema, compactClothingSearch } from "../clothing/search";
import { compactPlantsSearch, plantsSearchSchema } from "../plants/search";

test("目录旧链接忽略获取来源参数并保留其它筛选", () => {
  const input = {
    items: { q: "星屿", qualities: ["2"], acquisition: ["162"], sources: ["旧来源"] },
  };
  const compactions = [
    compactCatalogSearch(catalogSearchSchema.parse(input)),
    compactFurnitureSearch(furnitureSearchSchema.parse(input)),
    compactClothingSearch(clothingSearchSchema.parse(input)),
    compactPlantsSearch(plantsSearchSchema.parse(input)),
  ];
  for (const compact of compactions) {
    expect(compact.items).toMatchObject({ q: "星屿", qualities: ["2"] });
    expect(compact.items).not.toHaveProperty("acquisition");
    expect(compact.items).not.toHaveProperty("sources");
  }
});

test("植物系列和种子的旧链接保留相应视图的筛选", () => {
  const state = plantsSearchSchema.parse({
    view: "seeds",
    series: { flowerColors: ["白色"], acquisition: ["杂交"] },
    seeds: { harvestCounts: ["3"], acquisition: ["商店"] },
  });
  const compact = compactPlantsSearch(state);
  expect(compact.view).toBe("seeds");
  expect(compact.series).toMatchObject({ flowerColors: ["白色"] });
  expect(compact.seeds).toMatchObject({ harvestCounts: ["3"] });
  expect(compact.series).not.toHaveProperty("acquisition");
  expect(compact.seeds).not.toHaveProperty("acquisition");
});
