import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CatalogV5 } from "@loomix/content-schema/v5";
import { emptyCollectionDetail, emptyCropSeedDetail } from "@loomix/content-schema/v5";
import { loadCollectionView } from "./collection-loader.ts";
import { loadPlants } from "./plants/data.ts";
import { loadPlantsDetail } from "./plants/detail.ts";
import { queryPlants } from "./plants/query.ts";
import { emptyQuery as emptyPlantsQuery } from "./plants/search.ts";
import { loadMiscellany } from "./miscellany/data.ts";
import { loadMiscellanyDetail } from "./miscellany/detail.ts";
import { queryMiscellany } from "./miscellany/query.ts";
import { emptyQuery as emptyMiscellanyQuery } from "./miscellany/search.ts";

const catalog: CatalogV5 = {
  schemaVersion: 5,
  source: { gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 },
  ingredientCategories: [],
  cropSeeds: [
    {
      id: 900,
      name: "苹果种子",
      image: null,
      productIds: [30161],
      detail: emptyCropSeedDetail(900),
    },
  ],
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
      attributes: {
        originGalaxy: null,
        maturityPeriod: null,
        harvestCount: null,
        sources: "种植",
      },
      seedId: 900,
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
      attributes: { sources: "沙滩拾取" },
    },
  ],
  details: [emptyCollectionDetail(30161), emptyCollectionDetail(2000050)],
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
    expect(plants.items[0]).toHaveProperty("seedId", 900);
    expect(plants.items[0]).toHaveProperty("sources", "种植");
    expect(plants.items[0]?.summary.seeds).toMatchObject([{ id: 900, name: "苹果种子" }]);
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

  it("rejects legacy v3 resources", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              schemaVersion: 3,
              source: catalog.source,
              ingredientCategories: [],
              items: [],
            }),
          ),
      ),
    );
    await expect(loadCollectionView()).rejects.toThrow();
  });

  it("preserves furniture crafting recipes and ingredient names in collection data", async () => {
    const furnitureCatalog: CatalogV5 = {
      ...catalog,
      cropSeeds: [],
      items: [
        {
          id: 30162,
          name: "木桌",
          image: null,
          description: null,
          quality: null,
          encyclopediaEntry: null,
          kind: "item",
          category: "furniture",
          subcategory: "起居",
          attributes: { type: "桌子", size: null, colors: null, materials: "木", sources: null },
          craftingRecipes: [
            {
              id: 800,
              materials: [{ itemId: 30163, quantity: 3 }],
              unresolvedReason: null,
            },
          ],
        },
        {
          id: 30163,
          name: "木板",
          image: null,
          description: null,
          quality: null,
          encyclopediaEntry: null,
          kind: "item",
          category: "miscellaneous",
          subcategory: null,
          attributes: { sources: null },
        },
      ],
      details: [emptyCollectionDetail(30162), emptyCollectionDetail(30163)],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(furnitureCatalog))),
    );

    const collection = await loadCollectionView();
    expect(collection.furniture.items[0]?.craftingRecipes).toEqual([
      { id: 800, materials: [{ itemId: 30163, quantity: 3 }], unresolvedReason: null },
    ]);
    expect(collection.ingredientItemsById.get(30163)?.name).toBe("木板");
  });
});
