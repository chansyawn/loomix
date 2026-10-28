import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  isNotFound,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture.ts";
import type { MiscellaneousItem } from "../collection-view.ts";
import { findMiscellanyDetail, loadMiscellanyDetail, parseMiscellanyId } from "./detail";
import { miscellanyOrigin } from "./detail-navigation";
import { miscellanySearchSchema, compactMiscellanySearchMiddleware } from "./search";

const item: MiscellaneousItem = {
  id: 30031,
  name: "树胶",
  image: null,
  description: "良好的黏合剂。",
  quality: 1,
};
const data = [item];

afterEach(() => vi.unstubAllGlobals());

describe("miscellany details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseMiscellanyId("30031")).toBe(30031);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseMiscellanyId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("loads matching records and treats unknown IDs as not found", () => {
    expect(findMiscellanyDetail(data, "30031")).toEqual(item);
    try {
      findMiscellanyDetail(data, "30032");
      throw new Error("Expected not found");
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
  });

  it("keeps resource and schema failures retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(fixtureRequest(catalogFixture({ miscellaneous: data }))),
    );
    expect(await loadMiscellanyDetail("30031")).toEqual(item);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadMiscellanyDetail("30031")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadMiscellanyDetail("30031")).rejects.toThrow();
  });
});

function setup(initialEntries: string[]) {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/miscellany",
    validateSearch: miscellanySearchSchema,
    search: { middlewares: [compactMiscellanySearchMiddleware] },
  });
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/collection/miscellany/items/$id",
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, detail]),
  });
}

describe("miscellany detail navigation", () => {
  it("carries the filtered list origin through details and ignores direct detail visits", async () => {
    const router = setup(["/collection/miscellany?items=%7B%22q%22%3A%22木%22%7D"]);
    await router.load();
    const origin = miscellanyOrigin(router.state.location);
    expect(origin?.href).toContain("q");

    await router.navigate({
      to: "/collection/miscellany/items/$id",
      params: { id: String(item.id) },
      state: { miscellanyOrigin: origin },
    });
    expect(miscellanyOrigin(router.state.location)).toEqual(origin);
    expect(defaultParseSearch(origin?.href.split("?")[1] ?? "")).toEqual({ items: { q: "木" } });

    const direct = setup(["/collection/miscellany/items/30031"]);
    await direct.load();
    expect(miscellanyOrigin(direct.state.location)).toBeUndefined();
  });
});
