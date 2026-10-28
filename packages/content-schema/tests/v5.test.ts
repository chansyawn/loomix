import { expect, test } from "vite-plus/test";
import { emptyCatalog } from "../src/content.ts";
import { CatalogV4Schema, projectLegacyCatalog } from "../src/v4/content.ts";
import {
  emptyCollectionDetail,
  emptyCropSeedDetail,
  parseCatalogV5,
  projectLegacyCatalogV5,
} from "../src/v5/content.ts";

test("v5 keeps client-detail records separate from the existing catalog projection", () => {
  const emptyV3 = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  emptyV3.items.push({
    id: 10,
    name: "Flower",
    image: null,
    description: null,
    quality: null,
    encyclopediaEntry: null,
    category: "plants",
    kind: "item",
    subcategory: "花",
    attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null },
  });
  const legacy = CatalogV4Schema.parse({
    ...emptyV3,
    schemaVersion: 4,
    items: emptyV3.items.map((record) => ({
      ...record,
      attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null, sources: null },
      seedId: 20,
    })),
    cropSeeds: [{ id: 20, name: "Flower Seed", image: null, productIds: [10] }],
  });
  const catalog = parseCatalogV5({
    ...legacy,
    schemaVersion: 5,
    cropSeeds: [
      {
        id: 20,
        name: "Flower Seed",
        image: null,
        productIds: [10],
        detail: emptyCropSeedDetail(20),
      },
    ],
    details: [{ ...emptyCollectionDetail(10), flowerColors: ["White"] }],
  });

  expect(projectLegacyCatalogV5(catalog)).toEqual(projectLegacyCatalog(legacy));
});

test("v5 requires one detail record per item and matching detail IDs", () => {
  const legacy = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  expect(() =>
    parseCatalogV5({ ...legacy, schemaVersion: 5, cropSeeds: [], details: [] }),
  ).not.toThrow();
  expect(() => parseCatalogV5({ ...legacy, schemaVersion: 5, cropSeeds: [] })).toThrow();
});

test("v5 rejects duplicate detail identities, missing details, and mismatched seed details", () => {
  const legacy = CatalogV4Schema.parse({
    ...emptyCatalog({ gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 }),
    schemaVersion: 4,
    items: [
      {
        id: 10,
        name: "Flower",
        image: null,
        description: null,
        quality: null,
        encyclopediaEntry: null,
        category: "plants",
        kind: "item",
        subcategory: "花",
        attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null, sources: null },
        seedId: null,
      },
    ],
    cropSeeds: [],
  });
  const base = { ...legacy, schemaVersion: 5, cropSeeds: [], details: [emptyCollectionDetail(10)] };

  expect(() =>
    parseCatalogV5({ ...base, details: [emptyCollectionDetail(10), emptyCollectionDetail(10)] }),
  ).toThrow(/uniquely reference/);
  expect(() => parseCatalogV5({ ...base, details: [] })).toThrow(/Every catalog item/);
  expect(() =>
    parseCatalogV5({
      ...base,
      cropSeeds: [
        { id: 20, name: "Seed", image: null, productIds: [10], detail: emptyCropSeedDetail(21) },
      ],
    }),
  ).toThrow(/match unique seed IDs/);
});

test("v5 rejects unknown fields, incompatible versions, and inverted creature size ranges", () => {
  const legacy = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  const base = { ...legacy, schemaVersion: 5, cropSeeds: [], details: [] };

  expect(() => parseCatalogV5({ ...base, schemaVersion: 4 })).toThrow();
  expect(() => parseCatalogV5({ ...base, unexpected: true })).toThrow();
  expect(() =>
    parseCatalogV5({
      ...base,
      details: [{ ...emptyCollectionDetail(1), creatureSize: { min: 2, max: 1, unit: null } }],
    }),
  ).toThrow(/minimum size/);
});
