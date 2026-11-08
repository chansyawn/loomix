import { expect, test } from "vite-plus/test";
import { emptyCatalog } from "../content/schema/catalog.ts";
import {
  emptyCollectionDetail,
  parseCollectionObservations,
  baseCollectionObservations,
} from "./schema.ts";

function fixture() {
  const base = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  return {
    ...base,
    items: [
      {
        id: 10,
        name: "花",
        image: null,
        description: null,
        quality: null,
        encyclopediaEntry: null,
        category: "plants",
        kind: "item",
        subcategory: "花",
        attributes: { originGalaxy: null },
      },
    ],
    seeds: [
      {
        id: 20,
        name: "花种子",
        image: null,
        description: null,
        quality: null,
        growthId: 20,
        trade: null,
        acquisition: null,
      },
    ],
    growths: [
      {
        id: 20,
        kind: "staged",
        stages: [
          { id: 30, name: "花苗", image: null, plantId: null },
          { id: 31, name: "花株", image: null, plantId: 10 },
        ],
        maturityDays: null,
      },
    ],
    details: [emptyCollectionDetail(10)],
  };
}

test("observations keep planting data separate from the catalog entry projection", () => {
  const observed = parseCollectionObservations(fixture());
  expect(baseCollectionObservations(observed)).not.toHaveProperty("seeds");
  expect(observed.growths[0].stages[1].plantId).toBe(10);
  expect(observed.details[0]).not.toHaveProperty("growth");
});

test("observations require complete details and closed planting references", () => {
  const base = fixture();
  for (const patch of [
    { details: [] },
    { details: [...base.details, ...base.details] },
    { growths: [] },
    { seeds: [{ ...base.seeds[0], growthId: 99 }] },
    { growths: [{ ...base.growths[0], stages: [{ ...base.growths[0].stages[0], plantId: 999 }] }] },
    { cropSeeds: [] },
    { schemaVersion: 9 },
  ])
    expect(() => parseCollectionObservations({ ...base, ...patch })).toThrow();
});
