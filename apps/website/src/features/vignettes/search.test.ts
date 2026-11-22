import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { filterVignettes, vignetteSearchDefaults, vignetteSearchSchema } from "./search";
import type { VignetteSummary } from "./view";

test("可分享小栖地的筛选状态，无效参数回退为默认值", () => {
  const search = { q: "weifeng", site: "land", layout: "table" };
  expect(vignetteSearchSchema.parse(defaultParseSearch(defaultStringifySearch(search)))).toEqual(
    search,
  );
  expect(vignetteSearchSchema.parse({ q: 4, site: "sky", layout: "invalid" })).toEqual(
    vignetteSearchDefaults,
  );
});

test("拼音和地形条件同时参与筛选", () => {
  const flowerbed: VignetteSummary = {
    id: 1002,
    name: "微风花丛地",
    image: "image.webp",
    size: "6 × 6 格",
    stars: "2 星",
    site: "land",
    terrain: "陆地",
  };
  const waterside: VignetteSummary = {
    ...flowerbed,
    id: 2001,
    name: "临水连丛地",
    site: "water-edge",
    terrain: "水边",
  };
  expect(filterVignettes([flowerbed, waterside], { ...vignetteSearchDefaults, q: "wf" })).toEqual([
    flowerbed,
  ]);
  expect(
    filterVignettes([flowerbed, waterside], {
      ...vignetteSearchDefaults,
      q: "丛地",
      site: "water-edge",
    }),
  ).toEqual([waterside]);
});
