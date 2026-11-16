import { neighborAllowlist } from "./allowlist.ts";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { extractNeighbors, parseNeighborDatabase, verifyNeighbors } from "./index.ts";
import { extractNeighborBundle } from "./extract.ts";
import { createFixture, fixtureRows } from "./fixtures/tables.ts";
import { assertLayout } from "./fields.ts";
import { profile } from "../../../profile.ts";

test("extracts the fixed allowlist independently of dedicated configurations", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  assert.deepEqual(
    database.neighbors.map((n) => [n.id, n.nameZh]),
    neighborAllowlist.map((n) => [n.id, n.name]),
  );
  assert.equal(database.stars.length, 4);
  assert.ok(database.stories.every((story) => story.npcId !== 1005));
  assert.deepEqual(
    audit.exclusions.filter((e) => e.kind === "npc").map((e) => [e.key, e.reason]),
    [
      ["1012", "not_in_allowlist"],
      ["1014", "not_in_allowlist"],
      ["1016", "not_in_allowlist"],
      ["90001", "not_in_allowlist"],
    ],
  );
  verifyNeighbors(database, fixture.input);
});

test("groups all story rows by chapter, sorts paragraphs and preserves styled text and illustration-only paragraphs", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const database = extractNeighbors(fixture.input);
  assert.deepEqual(
    database.stories.map((s) => [s.key, s.titleZh, s.paragraphs.length]),
    [
      ["1010:1", "种子旅行", 2],
      ["1010:2", "下一章", 1],
    ],
  );
  assert.deepEqual(database.stories[0]!.paragraphs, [
    { sequence: 1, bodyZh: null, illustrationPath: "UISprite/Story.png", layout: "image" },
    { sequence: 2, bodyZh: "<i>原始正文\n第二段</i>", illustrationPath: null, layout: "text" },
  ]);
});

test("decodes story layout flags and records their source fields", (context) => {
  const rows = fixtureRows();
  rows[668] = [
    [1010, 1, { text: "布局" }, 1, { text: "左图" }, "UISprite/Left.png", null, 1],
    [1010, 1, null, 2, { text: "右图" }, "UISprite/Right.png"],
    [1010, 1, null, 3, null, "UISprite/Portrait.png", 1],
    [1010, 1, null, 4, null, "UISprite/Square.png"],
    [1010, 1, null, 5, { text: "正文" }, null],
  ];
  const fixture = createFixture(rows);
  context.onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  assert.deepEqual(
    database.stories[0]!.paragraphs.map((p) => p.layout),
    ["image-left", "image-right", "portrait-image", "image", "text"],
  );
  for (const record of audit.records.filter((r) => r.collection === "stories")) {
    assert.equal(record.source.kind, "table");
    assert.deepEqual(record.source.fields, [0, 1, 2, 3, 4, 5, 6, 7]);
  }
});

for (const field of [6, 7]) {
  test(`rejects unsupported story layout flag in field ${field}`, (context) => {
    const rows = fixtureRows();
    rows[668]![1]!.push(null, null);
    rows[668]![1]![field] = 2;
    const fixture = createFixture(rows);
    context.onTestFinished(fixture.cleanup);
    assert.throws(() => extractNeighbors(fixture.input), /Invalid story layout flags/);
  });
}

test("rejects empty story paragraphs", (context) => {
  const rows = fixtureRows();
  rows[668]![0]![4] = null;
  const fixture = createFixture(rows);
  context.onTestFinished(fixture.cleanup);
  assert.throws(() => extractNeighbors(fixture.input), /Empty story paragraph/);
});

test("extracts gift rules by namespace, normalizes category rows, and audits non-allowlisted neighbors", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  assert.deepEqual(
    database.giftPreferences.filter((preference) => preference.npcId === 11),
    [
      { key: "11:love", npcId: 11, level: "love", itemIds: [50000], tagIds: [] },
      { key: "11:favor", npcId: 11, level: "favor", itemIds: [30050], tagIds: [50000] },
      { key: "11:dislike", npcId: 11, level: "dislike", itemIds: [], tagIds: [50000] },
    ],
  );
  assert.equal(fixture.input.tagIndex.get(50000).internalName, "食物");
  assert.deepEqual(
    audit.exclusions.filter((entry) => entry.kind === "giftPreference").map((entry) => entry.key),
    ["1020:love"],
  );
  assert.ok(audit.records.some((entry) => entry.collection === "giftPreferences"));
});

test("strict schema rejects unknown fields, missing relationships, duplicate IDs, invalid sources and dangling references", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const database = extractNeighbors(fixture.input);
  assert.throws(() => parseNeighborDatabase({ ...database, root: 41 }));
  assert.throws(() =>
    parseNeighborDatabase({ ...database, source: { ...database.source, manifestId: "invalid" } }),
  );
  assert.throws(() =>
    parseNeighborDatabase({ ...database, source: { ...database.source, dataRevision: -1 } }),
  );
  assert.throws(() =>
    parseNeighborDatabase({
      ...database,
      neighbors: [...database.neighbors, database.neighbors[0]],
    }),
  );
  assert.throws(() => parseNeighborDatabase({ ...database, assets: [] }));
  const missing = structuredClone(database);
  Reflect.deleteProperty(missing.neighbors[0]!, "profile");
  assert.throws(() => parseNeighborDatabase(missing));
  const dangling = structuredClone(database);
  dangling.stars[0]!.npcId = 999;
  assert.throws(() => parseNeighborDatabase(dangling));
});

test("independent verification rejects a self-consistent missing neighbor, changed neighbor and mismatched source", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const database = extractNeighbors(fixture.input);
  const missing = structuredClone(database);
  missing.neighbors = missing.neighbors.filter((n) => n.id !== 1005);
  missing.stars = missing.stars.filter((s) => s.npcId !== 1005);
  missing.giftPreferences = missing.giftPreferences.filter((p) => p.npcId !== 1005);
  parseNeighborDatabase(missing);
  assert.throws(() => verifyNeighbors(missing, fixture.input), /roster/);
  const renamed = structuredClone(database);
  renamed.stars[0]!.nameZh = "错误星球";
  assert.throws(() => verifyNeighbors(renamed, fixture.input), /frozen sources/);
  assert.throws(
    () =>
      verifyNeighbors(
        { ...database, source: { ...database.source, manifestId: "2" } },
        fixture.input,
      ),
    /metadata/,
  );
});

test("serialization is byte-stable when source rows arrive in a different order", (context) => {
  const first = createFixture();
  const rows = fixtureRows();
  for (const records of Object.values(rows)) records.reverse();
  const second = createFixture(rows);
  context.onTestFinished(first.cleanup);
  context.onTestFinished(second.cleanup);
  assert.equal(
    JSON.stringify(extractNeighbors(first.input)),
    JSON.stringify(extractNeighbors(second.input)),
  );
  assert.equal(
    JSON.stringify(extractNeighbors(first.input)),
    JSON.stringify(extractNeighbors(first.input)),
  );
});

test("adapter rejects changed scalar widths and unresolved TextMap hashes", (context) => {
  const rows = fixtureRows();
  rows[41]![0]![4] = { byte: 117 };
  const narrow = createFixture(rows);
  context.onTestFinished(narrow.cleanup);
  assert.throws(() => extractNeighbors(narrow.input), /width/);
  const badRows = fixtureRows();
  badRows[668]![0]![4] = 999999;
  const unresolved = createFixture(badRows);
  context.onTestFinished(unresolved.cleanup);
  assert.throws(() => extractNeighbors(unresolved.input), /TextMap/);
});

test("invalid references and unexpected table fields stop extraction", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const tables = fixture.input.tables;
  const row = tables.rows(profile.roots.neighborStars)[0]!;
  const field = tables.fields(row)[15]!;
  tables.reader.b.writeUInt32BE((0x7fffffff ^ profile.wordMask) >>> 0, field);
  assert.throws(() => extractNeighbors(fixture.input), /Invalid string/);
  assert.throws(
    () => assertLayout(tables, row, { illustration: [15, "vector"] }, 16),
    /out of bounds/,
  );
  const rows = fixtureRows();
  rows[668]![0]!.push(...Array<null>(10).fill(null), 1);
  const changed = createFixture(rows);
  context.onTestFinished(changed.cleanup);
  assert.throws(() => extractNeighbors(changed.input), /layout/);
});

test("rejects missing, incomplete or renamed allowlisted masters", (context) => {
  for (const change of ["missing", "model", "name"] as const) {
    const rows = fixtureRows();
    const row = rows[41]!.find((row) => row[0] === 11)!;
    if (change === "missing") rows[41] = rows[41]!.filter((candidate) => candidate !== row);
    else if (change === "model") row[3] = null;
    else row[1] = { text: "不同名称" };
    const fixture = createFixture(rows);
    context.onTestFinished(fixture.cleanup);
    assert.throws(() => extractNeighbors(fixture.input), /master|allowlist/);
  }
});

test("excludes fully configured non-allowlisted neighbors", (context) => {
  const rows = fixtureRows();
  rows[630]!.push(rows[630]![0]!.map((cell, index) => (index === 5 ? 1014 : cell)));
  rows[668]!.push([1014, 1, { text: "图塔故事" }, 1, { text: "正文" }, null]);
  const fixture = createFixture(rows);
  context.onTestFinished(fixture.cleanup);
  const database = extractNeighbors(fixture.input);
  assert.ok(database.neighbors.every((n) => n.id !== 1014));
  assert.ok(database.stars.every((s) => s.npcId !== 1014));
  assert.ok(database.stories.every((s) => s.npcId !== 1014));
  verifyNeighbors(database, fixture.input);
});
