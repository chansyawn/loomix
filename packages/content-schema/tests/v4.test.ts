import { expect, test } from "vite-plus/test";
import { parseCatalog } from "../src/index.ts";
import { parseCatalogV4, projectLegacyCatalog } from "../src/v4/index.ts";

function fixture() {
  const base = {
    name: "fixture",
    image: null,
    description: null,
    quality: 0,
    encyclopediaEntry: { listed: true },
    kind: "item",
    subcategory: null,
  };
  return {
    schemaVersion: 4,
    source: { gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 },
    ingredientCategories: [],
    items: [
      { ...base, id: 1, category: "miscellaneous", attributes: { sources: "沙滩拾取" } },
      {
        ...base,
        id: 2,
        category: "furniture",
        attributes: { type: null, size: null, colors: null, materials: null, sources: null },
        craftingRecipes: [
          { id: 200, materials: [{ itemId: 1, quantity: 5 }], unresolvedReason: null },
        ],
      },
      {
        ...base,
        id: 3,
        category: "plants",
        attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: 3, sources: "种植" },
        seedId: 100,
      },
      {
        ...base,
        id: 4,
        category: "dishes",
        attributes: {
          difficulty: "招牌",
          galaxyFlavor: null,
          cookware: null,
          effects: null,
          sources: "烹饪",
          tastes: ["甜", "咸"],
        },
        recipe: null,
        difficultyRequirement: {
          rawExpression: "fixture",
          condition: { kind: "chefLevelGreaterOrEqual", level: 5 },
          unresolvedReason: null,
        },
      },
    ],
    cropSeeds: [{ id: 100, name: "seed", image: null, productIds: [3] }],
  };
}

test("v4 round-trips typed additions while projection preserves the v3 contract", () => {
  const input = fixture();
  const catalog = parseCatalogV4(input);
  expect(catalog).toEqual(input);
  expect(() => parseCatalog(catalog)).toThrow();
  const legacy = projectLegacyCatalog(catalog);
  expect(parseCatalog(legacy)).toEqual(legacy);
  expect(legacy.items[0]).toHaveProperty("attributes", {});
  expect(legacy.items[2]).not.toHaveProperty("seedId");
});

test("v4 rejects dangling/duplicate seed and material references and invalid quantities", () => {
  for (const change of [
    (c: ReturnType<typeof fixture>) => {
      c.cropSeeds[0].id = 999;
    },
    (c: ReturnType<typeof fixture>) => {
      c.cropSeeds[0].productIds = [2];
    },
    (c: ReturnType<typeof fixture>) => {
      c.cropSeeds.push(c.cropSeeds[0]);
    },
    (c: ReturnType<typeof fixture>) => {
      Object.assign(c.items[1], {
        craftingRecipes: [
          { id: 200, materials: [{ itemId: 999, quantity: 5 }], unresolvedReason: null },
        ],
      });
    },
    (c: ReturnType<typeof fixture>) => {
      Object.assign(c.items[1], {
        craftingRecipes: [
          { id: 200, materials: [{ itemId: 1, quantity: 0 }], unresolvedReason: null },
        ],
      });
    },
    (c: ReturnType<typeof fixture>) => {
      Object.assign(c.items[1], {
        craftingRecipes: [
          {
            id: 200,
            unresolvedReason: null,
            materials: [
              { itemId: 1, quantity: 5 },
              { itemId: 1, quantity: 2 },
            ],
          },
        ],
      });
    },
    (c: ReturnType<typeof fixture>) => {
      c.items[3].attributes.tastes = ["甜", "甜"];
    },
  ]) {
    const input = fixture();
    change(input);
    expect(() => parseCatalogV4(input)).toThrow();
  }
});

test("unknown difficulty semantics require an explicit reason", () => {
  const input = fixture();
  Object.assign(input.items[3], {
    difficultyRequirement: { rawExpression: "fixture", condition: null, unresolvedReason: null },
  });
  expect(() => parseCatalogV4(input)).toThrow(/Unknown conditions/);
  Object.assign(input.items[3], {
    difficultyRequirement: {
      rawExpression: "fixture",
      condition: null,
      unresolvedReason: "unsupported_condition_structure",
    },
  });
  expect(() => parseCatalogV4(input)).not.toThrow();
});
