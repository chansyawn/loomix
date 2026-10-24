import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { emptyCatalog } from "@loomix/content-schema";
import type { Catalog } from "@loomix/content-schema";
import { loadCollectionView } from "./collection-loader.ts";
import { loadPlants } from "./plants/data.ts";
import { loadPlantsDetail } from "./plants/detail.ts";
import { queryPlants } from "./plants/query.ts";
import { emptyQuery as emptyPlantsQuery } from "./plants/search.ts";
import { loadMiscellany } from "./miscellany/data.ts";
import { loadMiscellanyDetail } from "./miscellany/detail.ts";
import { queryMiscellany } from "./miscellany/query.ts";
import { emptyQuery as emptyMiscellanyQuery } from "./miscellany/search.ts";

const catalog: Catalog = {
  ...emptyCatalog({ gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 }),
  items: [
    {
      id: 30161,
      name: "苹果",
      image: null,
      description: "从树上掉落的苹果。",
      quality: 0,
      encyclopediaEntry: null,
      kind: "item",
      category: "plants",
      subcategory: "采摘材料",
      attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null },
    },
    {
      id: 2000050,
      name: "肉",
      image: null,
      description: null,
      quality: 1,
      encyclopediaEntry: null,
      kind: "item",
      category: "miscellaneous",
      subcategory: null,
      attributes: {},
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("unified catalog loading", () => {
  it("makes confirmed apples and meat available through existing search and detail entrypoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(catalog))),
    );
    const plants = await loadPlants();
    expect(
      queryPlants(plants, "items", { ...emptyPlantsQuery(), q: "苹果", categories: ["采摘材料"] })
        .rows,
    ).toMatchObject([{ id: 30161, name: "苹果" }]);
    expect(await loadPlantsDetail("items", "30161")).toMatchObject({
      record: {
        id: 30161,
        category: "采摘材料",
        originGalaxy: null,
        maturityPeriod: null,
        harvestCount: null,
      },
      series: [],
    });
    const miscellaneous = await loadMiscellany();
    expect(
      queryMiscellany(miscellaneous, { ...emptyMiscellanyQuery(), q: "肉" }).rows,
    ).toMatchObject([{ id: 2000050, name: "肉" }]);
    expect(await loadMiscellanyDetail("2000050")).toEqual({
      id: 2000050,
      name: "肉",
      image: null,
      description: null,
      quality: 1,
    });
  });

  it("allows a later request to recover after transport or schema failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(new Response("{}"))
        .mockResolvedValueOnce(new Response(JSON.stringify(catalog))),
    );
    await expect(loadCollectionView()).rejects.toThrow("503");
    await expect(loadCollectionView()).rejects.toThrow();
    expect((await loadCollectionView()).plants.items).toMatchObject([{ id: 30161 }]);
  });
});
