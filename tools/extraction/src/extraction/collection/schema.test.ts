import { expect, test } from "vite-plus/test";
import { emptyCatalog } from "../content/schema/catalog.ts";
import { baseObservations } from "./relations.ts";
import {
  emptyCollectionDetail,
  emptyCropSeedDetail,
  parseCollectionObservations,
  baseCollectionObservations,
} from "./schema.ts";

test("Collection observations keeps client-detail records separate from the existing catalog projection", () => {
  const baseInput = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  baseInput.items.push({
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
  const observed = parseCollectionObservations({
    ...baseInput,
    schemaVersion: 1,
    items: baseInput.items.map((record) => ({
      ...record,
      attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null, sources: null },
      seedId: 20,
    })),
    cropSeeds: [
      {
        id: 20,
        name: "Flower Seed",
        image: null,
        productIds: [10],
        detail: emptyCropSeedDetail(20),
      },
    ],
    details: [emptyCollectionDetail(10)],
  });
  const catalog = parseCollectionObservations({
    ...observed,
    schemaVersion: 1,
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

  expect(baseCollectionObservations(catalog)).toEqual(baseObservations(observed));
});

test("Collection observations requires one detail record per item and matching detail IDs", () => {
  const observed = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  expect(() =>
    parseCollectionObservations({ ...observed, schemaVersion: 1, cropSeeds: [], details: [] }),
  ).not.toThrow();
  expect(() =>
    parseCollectionObservations({ ...observed, schemaVersion: 1, cropSeeds: [] }),
  ).toThrow();
});

test("Collection observations rejects duplicate detail identities, missing details, and mismatched seed details", () => {
  const observed = parseCollectionObservations({
    ...emptyCatalog({ gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 }),
    schemaVersion: 1,
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
    details: [emptyCollectionDetail(10)],
  });
  const base = {
    ...observed,
    schemaVersion: 1,
    cropSeeds: [],
    details: [emptyCollectionDetail(10)],
  };

  expect(() =>
    parseCollectionObservations({
      ...base,
      details: [emptyCollectionDetail(10), emptyCollectionDetail(10)],
    }),
  ).toThrow(/uniquely reference/);
  expect(() => parseCollectionObservations({ ...base, details: [] })).toThrow(/Every catalog item/);
  expect(() =>
    parseCollectionObservations({
      ...base,
      cropSeeds: [
        { id: 20, name: "Seed", image: null, productIds: [10], detail: emptyCropSeedDetail(21) },
      ],
    }),
  ).toThrow(/match unique seed IDs/);
});

test("Collection observations rejects unknown fields, incompatible versions, and inverted creature size ranges", () => {
  const observed = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  const base = { ...observed, schemaVersion: 1, cropSeeds: [], details: [] };

  expect(() => parseCollectionObservations({ ...base, schemaVersion: 9 })).toThrow();
  expect(() => parseCollectionObservations({ ...base, unexpected: true })).toThrow();
  expect(() =>
    parseCollectionObservations({
      ...base,
      details: [{ ...emptyCollectionDetail(1), creatureSize: { min: 2, max: 1, unit: null } }],
    }),
  ).toThrow(/minimum size/);
});
