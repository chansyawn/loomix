import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { extractNeighborBundle } from "./extract.ts";
import {
  extractNeighbors,
  parseNeighborClothingDatabase,
  verifyNeighborClothing,
  verifyNeighbors,
} from "./index.ts";
import { neighborImagePaths } from "./schema.ts";
import { createFixture, fixtureRows, type FixtureRows } from "./fixtures/tables.ts";

type Cell = FixtureRows[number][number][number];

function cells(length: number, fields: Readonly<Record<number, Cell>>): Cell[] {
  const row: Cell[] = Array.from({ length }, () => null);
  for (const [index, value] of Object.entries(fields)) row[Number(index)] = value;
  return row;
}

function outfitRows(): FixtureRows {
  const rows = fixtureRows();
  rows[318]!.push(
    cells(14, { 0: 60001, 1: { text: "玩家同款帽子" } }),
    cells(14, {
      0: 1160001,
      1: { text: "友邻同款帽子" },
      9: "蓝色;白色;蓝色",
      11: "毛线",
      12: "休闲",
    }),
    cells(14, { 0: 60002, 1: { text: "蛮蛮原生帽子" }, 13: "友邻专属" }),
  );
  for (const id of [1160001, 60002])
    rows[325]!.push(
      cells(28, {
        0: id,
        4: `UISprite/Load/Item/${id}_s`,
        5: `UISprite/Load/Item/${id}_b`,
        27: { text: "帽子描述" },
      }),
    );
  rows[416]!.push([5, null, null, null, { text: "头戴物" }]);
  rows[474]!.push(
    cells(12, {
      0: 1160001,
      2: 5001,
      7: "NpcOutfits/Small/1160001",
      8: "NpcOutfits/Medium/1160001",
      9: "NpcOutfits/Big/1160001",
      10: { byte: 1 },
      11: 60001,
    }),
    cells(12, { 0: 60002, 1: 11, 2: 5001, 7: "NpcOutfits/Small/60002", 11: 60003 }),
    cells(12, { 0: 1160002, 2: 5001, 7: "NpcOutfits/Small/1160002" }),
    cells(12, { 0: 60004, 1: 1014, 2: 5001, 7: "NpcOutfits/Small/60004" }),
    cells(12, { 0: 60005, 2: 5001, 7: "NpcOutfits/Small/60005" }),
  );
  for (const [id, group] of [
    [50001, 500],
    [50601, 506],
  ] as const)
    rows[659]!.push(cells(27, { 0: id, 1: group, 2: 1160001, 10: 120, 11: 200014 }));
  return rows;
}

test("extracts confirmed outfits, explicit counterparts, configured offers and complete table evidence", (context) => {
  const fixture = createFixture(outfitRows());
  context.onTestFinished(fixture.cleanup);
  const { database, clothing, audit } = extractNeighborBundle(fixture.input);
  assert.deepEqual(
    clothing.map(({ id, relationship, neighborId }) => [id, relationship, neighborId]),
    [
      [60002, "neighbor-specific", 11],
      [1160001, "matching", null],
    ],
  );
  const matching = clothing[1]!;
  assert.equal(matching.playerItemId, 60001);
  assert.equal(matching.playerItemNameZh, "玩家同款帽子");
  assert.equal(matching.slotNameZh, "头戴物");
  assert.deepEqual(matching.colors, ["白色", "蓝色"]);
  assert.deepEqual(matching.materials, ["毛线"]);
  assert.deepEqual(matching.styles, ["休闲"]);
  assert.deepEqual(matching.modelPaths, {
    small: "NpcOutfits/Small/1160001",
    medium: "NpcOutfits/Medium/1160001",
    big: "NpcOutfits/Big/1160001",
  });
  assert.deepEqual(matching.offers, [
    { id: 50001, goodsGroupId: 500, configuredPrice: 120, currencyItemId: 200014 },
    { id: 50601, goodsGroupId: 506, configuredPrice: 120, currencyItemId: 200014 },
  ]);
  const native = clothing[0]!;
  assert.equal(native.playerItemId, 60003);
  assert.equal(native.playerItemNameZh, null);
  assert.deepEqual(native.specialTags, ["友邻专属"]);
  assert.deepEqual(native.offers, []);
  assert.deepEqual(
    audit.exclusions
      .filter((entry) => entry.kind === "outfit")
      .map(({ key, reason }) => [key, reason]),
    [
      ["1160002", "missing_explicit_player_counterpart"],
      ["60004", "not_in_allowlist"],
      ["60005", "unconfirmed_neighbor_association"],
    ],
  );
  assert.equal(audit.counts.outfits, 2);
  assert.equal(audit.counts.matchingOutfits, 1);
  assert.equal(audit.counts.neighborSpecificOutfits, 1);
  assert.equal(audit.counts.tokenPricedOutfits, 1);
  assert.equal(audit.counts.tokenPricedOffers, 2);
  const proofs = audit.records.filter(
    (entry) => entry.collection === "outfits" && entry.key === "1160001",
  );
  assert.equal(proofs.length, 7);
  assert.deepEqual(
    [
      ...new Set(
        proofs.flatMap((entry) => (entry.source.kind === "table" ? [entry.source.table] : [])),
      ),
    ].sort((a, b) => a - b),
    [318, 325, 416, 474, 659],
  );
  assert.ok(
    neighborImagePaths(database).every(
      (imagePath) => !clothing.some((item) => item.imagePath === imagePath),
    ),
  );
  verifyNeighbors(database, fixture.input);
  verifyNeighborClothing(
    { schemaVersion: 1, source: database.source, items: clothing },
    fixture.input,
  );
});

test("outfit serialization is stable across row order and equivalent duplicate displays", (context) => {
  const rows = outfitRows();
  const first = createFixture(rows);
  rows[325]!.push([...rows[325]![0]!]);
  for (const records of Object.values(rows)) records.reverse();
  const second = createFixture(rows);
  context.onTestFinished(first.cleanup);
  context.onTestFinished(second.cleanup);
  assert.equal(
    JSON.stringify(extractNeighbors(first.input)),
    JSON.stringify(extractNeighbors(second.input)),
  );
});

const invalidSources: { name: string; change: (rows: FixtureRows) => void; error: RegExp }[] = [
  {
    name: "duplicate outfit ID",
    change: (rows) => {
      rows[474]!.push([...rows[474]![0]!]);
    },
    error: /Duplicate neighbor outfit/,
  },
  {
    name: "missing item",
    change: (rows) => {
      rows[318] = rows[318]!.filter((row) => row[0] !== 1160001);
    },
    error: /Missing neighbor outfit item/,
  },
  {
    name: "missing display",
    change: (rows) => {
      rows[325] = rows[325]!.filter((row) => row[0] !== 1160001);
    },
    error: /Missing neighbor outfit item/,
  },
  {
    name: "conflicting item reference",
    change: (rows) => {
      rows[318]!.push(cells(14, { 0: 1160001, 1: { text: "不同名称" } }));
    },
    error: /Conflicting/,
  },
  {
    name: "unknown slot",
    change: (rows) => {
      rows[474]![0]![2] = 9001;
    },
    error: /Unknown neighbor outfit slot/,
  },
  {
    name: "missing size models",
    change: (rows) => {
      rows[474]![0]!.splice(7, 3, null, null, null);
    },
    error: /Missing neighbor outfit models/,
  },
  {
    name: "changed flag width",
    change: (rows) => {
      rows[474]![0]![10] = 1;
    },
    error: /byte width/,
  },
  {
    name: "duplicate offer ID",
    change: (rows) => {
      rows[659]!.push([...rows[659]![0]!]);
    },
    error: /Duplicate neighbor outfit offer/,
  },
  {
    name: "conflicting prices",
    change: (rows) => {
      rows[659]![1]![10] = 150;
    },
    error: /Conflicting configured neighbor outfit prices/,
  },
];

for (const { name, change, error } of invalidSources)
  test(`rejects ${name} in outfit source tables`, (context) => {
    const rows = outfitRows();
    change(rows);
    const fixture = createFixture(rows);
    context.onTestFinished(fixture.cleanup);
    assert.throws(() => extractNeighbors(fixture.input), error);
  });

test("outfit validation and frozen-source verification reject incomplete or tampered records", (context) => {
  const fixture = createFixture(outfitRows());
  context.onTestFinished(fixture.cleanup);
  const bundle = extractNeighborBundle(fixture.input);
  const clothingData = {
    schemaVersion: 1 as const,
    source: bundle.database.source,
    items: bundle.clothing,
  };
  for (const change of [
    (value: typeof clothingData) => {
      value.items[1]!.playerItemId = null;
    },
    (value: typeof clothingData) => {
      value.items[0]!.neighborId = null;
    },
    (value: typeof clothingData) => {
      value.items[0]!.neighborId = 999;
    },
    (value: typeof clothingData) => {
      value.items[0]!.modelPaths = { small: null, medium: null, big: null };
    },
    (value: typeof clothingData) => {
      value.items.push(value.items[0]!);
    },
    (value: typeof clothingData) => {
      value.items[1]!.offers.push(value.items[1]!.offers[0]!);
    },
  ]) {
    const invalid = structuredClone(clothingData);
    change(invalid);
    assert.throws(() => {
      parseNeighborClothingDatabase(invalid);
      verifyNeighborClothing(invalid, fixture.input);
    });
  }
  const missing = structuredClone(clothingData);
  missing.items.pop();
  assert.throws(() => verifyNeighborClothing(missing, fixture.input), /frozen sources/);
  const changed = structuredClone(clothingData);
  changed.items[1]!.offers[0]!.configuredPrice = 121;
  assert.throws(() => verifyNeighborClothing(changed, fixture.input), /frozen sources/);
});
