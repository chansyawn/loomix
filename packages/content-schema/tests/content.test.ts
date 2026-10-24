import { expect, expectTypeOf, test } from "vite-plus/test";
import {
  CatalogSchema,
  emptyCatalog,
  parseCatalog,
  recordSchemas,
  recordTypes,
  attributeSchemas,
  recordFields,
} from "../src/index.ts";
import type { Catalog, CatalogRecord, ItemRecord } from "../src/index.ts";
const source = { gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 };
const base = {
  name: "fixture",
  image: null,
  description: null,
  quality: 0,
  encyclopediaEntry: { listed: true },
};
function fixture(): Catalog {
  const catalog = emptyCatalog(source);
  for (const [index, type] of recordTypes.entries()) {
    const [category, kind] = type.split(".");
    const attributes =
      kind === "item"
        ? Object.fromEntries(
            Object.keys(attributeSchemas[category as ItemRecord["category"]].shape).map((field) => [
              field,
              null,
            ]),
          )
        : undefined;
    catalog.items.push(
      recordSchemas[type].parse({
        ...base,
        id: index + 1,
        category,
        kind,
        ...(kind === "item"
          ? { subcategory: null, attributes }
          : kind === "appearance"
            ? { subcategory: null }
            : { memberIds: null }),
      }),
    );
  }
  return catalog;
}
test("all twelve legal category/kind combinations round-trip in one catalog", () => {
  const catalog = fixture();
  expect(parseCatalog(catalog)).toEqual(catalog);
  expect(catalog.items).toHaveLength(12);
  expect(parseCatalog(emptyCatalog(source))).toEqual(emptyCatalog(source));
  expectTypeOf(parseCatalog(catalog)).toEqualTypeOf<Catalog>();
});
test("unknown attributes, absent encyclopedia, and unknown or empty memberships remain distinct", () => {
  const catalog = fixture();
  catalog.items[0].encyclopediaEntry = null;
  catalog.items[2].encyclopediaEntry = { listed: false };
  const sets = catalog.items.filter((record) => record.kind === "set");
  sets[0].memberIds = null;
  sets[1].memberIds = [];
  expect(parseCatalog(catalog)).toEqual(catalog);
});
test("only same-category item IDs may be collection members", () => {
  const catalog = fixture();
  const set = catalog.items.find(
    (record) => record.kind === "set" && record.category === "furniture",
  )!;
  if (set.kind !== "set") throw new Error("fixture");
  set.memberIds = [catalog.items[0].id];
  expect(parseCatalog(catalog)).toEqual(catalog);
  for (const members of [
    [999],
    [set.id],
    [catalog.items[2].id],
    [catalog.items[0].id, catalog.items[0].id],
  ]) {
    set.memberIds = members;
    expect(() => parseCatalog(catalog)).toThrow();
  }
});
const invalid: [string, (catalog: Catalog) => void][] = [
  [
    "global duplicate ID",
    (c) => {
      c.items[1].id = c.items[0].id;
    },
  ],
  [
    "zero ID",
    (c) => {
      c.items[0].id = 0;
    },
  ],
  [
    "negative ID",
    (c) => {
      c.items[0].id = -1;
    },
  ],
  [
    "fractional ID",
    (c) => {
      c.items[0].id = 1.5;
    },
  ],
  [
    "unsafe ID",
    (c) => {
      c.items[0].id = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
  [
    "invalid quality",
    (c) => {
      Object.assign(c.items[0], { quality: 5 });
    },
  ],
  [
    "fractional quality",
    (c) => {
      Object.assign(c.items[0], { quality: 1.5 });
    },
  ],
  [
    "empty name",
    (c) => {
      c.items[0].name = "";
    },
  ],
  [
    "missing base field",
    (c) => {
      Reflect.deleteProperty(c.items[0], "description");
    },
  ],
  [
    "unknown base field",
    (c) => {
      Object.assign(c.items[0], { implemented: true });
    },
  ],
  [
    "missing encyclopedia state",
    (c) => {
      Reflect.deleteProperty(c.items[0], "encyclopediaEntry");
    },
  ],
  [
    "invalid encyclopedia shape",
    (c) => {
      Object.assign(c.items[0], { encyclopediaEntry: { listed: true, extra: true } });
    },
  ],
  [
    "invalid category/kind",
    (c) => {
      Object.assign(c.items[0], { category: "plants", kind: "appearance" });
    },
  ],
  [
    "cross-category attributes",
    (c) => {
      Object.assign(c.items[0], { attributes: { harvestCount: 1 } });
    },
  ],
  [
    "extra attribute",
    (c) => {
      const r = c.items[0];
      if (r.kind === "item") Object.assign(r.attributes, { unexpected: null });
    },
  ],
  [
    "missing attribute",
    (c) => {
      const r = c.items[0];
      if (r.kind === "item") Reflect.deleteProperty(r.attributes, "colors");
    },
  ],
  [
    "redundant collection name",
    (c) => {
      Object.assign(c.items[1], { seriesName: "fixture" });
    },
  ],
  [
    "missing subcategory",
    (c) => {
      Reflect.deleteProperty(c.items[0], "subcategory");
    },
  ],
  [
    "old schema version",
    (c) => {
      Object.assign(c, { schemaVersion: 1 });
    },
  ],
  [
    "missing source field",
    (c) => {
      Reflect.deleteProperty(c.source, "resourceRevision");
    },
  ],
  [
    "unexpected top-level index",
    (c) => {
      Object.assign(c, { plants: [] });
    },
  ],
  [
    "invalid image",
    (c) => {
      c.items[0].image = "assets/icon.png";
    },
  ],
];
test.each(invalid)("rejects %s", (_name, mutate) => {
  const c = fixture();
  mutate(c);
  expect(CatalogSchema.safeParse(c).success).toBe(false);
});
test("plant harvest count must be nonnegative integer and misc has no attributes", () => {
  const c = fixture();
  const plant = c.items.find(
    (r): r is Extract<CatalogRecord, { category: "plants"; kind: "item" }> =>
      r.category === "plants" && r.kind === "item",
  )!;
  for (const value of [-1, 1.5]) {
    plant.attributes.harvestCount = value;
    expect(() => parseCatalog(c)).toThrow();
  }
  plant.attributes.harvestCount = 0;
  expect(parseCatalog(c)).toEqual(c);
  const misc = c.items.find((r) => r.category === "miscellaneous")!;
  Object.assign(misc, { attributes: { colors: null } });
  expect(() => parseCatalog(c)).toThrow();
});
test("audit field paths follow the unified model", () => {
  expect(recordFields("plants.item")).toContain("attributes.harvestCount");
  expect(recordFields("plants.series")).toContain("memberIds");
  expect(recordFields("plants.item")).not.toContain("encyclopediaEntry");
});
