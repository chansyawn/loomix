import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
} from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { neighborsSearchMiddleware, neighborsSearchSchema } from "../neighbors/search";
import { starseaSearchMiddleware, starseaSearchSchema } from "../starsea/search";
import { vignetteSearchMiddleware, vignetteSearchSchema } from "../vignettes/search";
import { resolveLayout } from "./layout";

const root = createRootRoute();
const neighbors = createRoute({
  getParentRoute: () => root,
  path: "/neighbors",
  validateSearch: neighborsSearchSchema,
  search: { middlewares: [neighborsSearchMiddleware] },
});
const starsea = createRoute({
  getParentRoute: () => root,
  path: "/starsea",
  validateSearch: starseaSearchSchema,
  search: { middlewares: [starseaSearchMiddleware] },
});
const vignettes = createRoute({
  getParentRoute: () => root,
  path: "/vignettes",
  validateSearch: vignetteSearchSchema,
  search: { middlewares: [vignetteSearchMiddleware] },
});
const routeTree = root.addChildren([neighbors, starsea, vignettes]);
const routes = [
  { path: "/neighbors", schema: neighborsSearchSchema, filter: { galaxy: "禾夏" } },
  { path: "/starsea", schema: starseaSearchSchema, filter: { region: 12 } },
  { path: "/vignettes", schema: vignetteSearchSchema, filter: { site: "land" } },
] as const;

test.each(routes)(
  "$path preserves explicit layouts through filter changes",
  ({ path, schema, filter }) => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
    });

    for (const layout of ["grid", "table"] as const) {
      const search = schema.parse({ ...filter, q: "测试", layout });
      const location = router.buildLocation({ to: path, search });
      expect(defaultParseSearch(location.searchStr)).toEqual({ ...filter, q: "测试", layout });
      expect(schema.parse(defaultParseSearch(location.searchStr))).toEqual(search);
      const cleared = router.buildLocation({
        to: path,
        search: { ...search, ...schema.parse({}), layout },
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    }

    for (const layout of [undefined, "invalid"]) {
      const search = schema.parse({ layout });
      const location = router.buildLocation({ to: path, search });
      expect(location.href).toBe(path);
      expect(resolveLayout(search.layout, "table")).toBe("table");
    }
  },
);
