import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { resolveStarseaSearch, starseaSearchSchema } from "./search";

test("星海区域按 ID 区分，筛选和列表视图可通过 URL 还原", () => {
  const regions = [
    { id: 1, galaxyName: "禾夏" },
    { id: 2, galaxyName: "禾夏" },
  ];
  for (const region of regions) {
    const search = { region: region.id, layout: "table" };
    const parsed = starseaSearchSchema.parse(defaultParseSearch(defaultStringifySearch(search)));
    expect(resolveStarseaSearch(regions, parsed)).toEqual(search);
  }
});

test("无效或未知区域回到全部，保留合法视图", () => {
  const regions = [{ id: 1 }];
  for (const query of ["?region=-1", "?region=2", "?region=invalid", "?region=1.5"]) {
    const search = starseaSearchSchema.parse(defaultParseSearch(`${query}&layout=table`));
    expect(resolveStarseaSearch(regions, search)).toEqual({ region: null, layout: "table" });
  }
  expect(starseaSearchSchema.parse({ layout: "invalid" })).toEqual({
    region: null,
    layout: "grid",
  });
});
