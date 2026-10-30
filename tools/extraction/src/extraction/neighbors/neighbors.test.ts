import { neighborAllowlist } from "./allowlist.ts";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { extractNeighbors, parseNeighborDatabase, verifyNeighbors } from "./index.ts";
import { extractNeighborBundle } from "./extract.ts";
import { createFixture, fixtureRows } from "./fixtures/tables.ts";
import { assertLayout } from "./fields.ts";
import { profile } from "../../profile.ts";

test("extracts the fixed allowlist independently of dedicated configurations", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  assert.deepEqual(
    database.neighbors.map((n) => [n.id, n.nameZh]),
    neighborAllowlist.map((n) => [n.id, n.name]),
  );
  assert.equal(database.stars.length, 4);
  const huanxue = database.neighbors.find((n) => n.id === 1005)!;
  assert.deepEqual(huanxue.storyKeys, []);
  assert.deepEqual(huanxue.furnishingThemeIds, []);
  assert.deepEqual(huanxue.rewardItemIds, []);
  assert.equal(huanxue.avatarPath, null);
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
    { sequence: 1, bodyZh: null, illustrationPath: "UISprite/Story.png" },
    { sequence: 2, bodyZh: "<i>原始正文\n第二段</i>", illustrationPath: null },
  ]);
});

test("separates the speaker from variant IDs and keeps resource travel conditions distinct from gift preferences", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const database = extractNeighbors(fixture.input);
  const fallback = database.travelReactions.find((r) => r.npcId === null)!;
  const harvest = database.travelReactions.find((r) => r.resourceCategory === "作物")!;
  assert.equal(fallback.variantId, 1);
  assert.equal(fallback.textZh, null);
  assert.equal(harvest.npcId, 1010);
  assert.equal(harvest.variantId, 1);
  assert.equal(harvest.threshold, "3");
  assert.equal(harvest.textZh, "丰收了！");
  assert.ok(!JSON.stringify(database).includes("giftPreferences"));
});

test("links explicit themes and catalog rewards, excludes test rules and leaves unconfirmed island associations empty", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  assert.equal(database.friendshipRules.length, 1);
  assert.equal(database.friendshipRules[0]!.level, 7);
  assert.equal(database.furnishingThemes.length, 1);
  assert.equal(database.furnishingThemes[0]!.nameZh, "听丰年创想卡集");
  assert.equal(database.furnishingThemes[0]!.themePath, "UI/Recipe/BgThemeTingFengNian");
  assert.deepEqual(database.neighbors.find((n) => n.id === 1010)!.furnishingThemeIds, [5]);
  assert.deepEqual(database.neighbors.find((n) => n.id === 1010)!.furnishingThemeKeys, [
    "theme:听丰年创想卡集",
  ]);
  assert.deepEqual(database.encounterIslands[0]!.neighborIds, []);
  assert.equal(database.encounterIslands[0]!.sceneId, 10001010);
  assert.deepEqual(database.rewards, [
    {
      itemId: 1128,
      itemNameZh: "小方凳",
      category: "furniture",
      kind: "item",
      sources: ["完成友邻事件"],
      relatedNeighborIds: [],
    },
  ]);
  assert.equal(audit.catalogReferences[0]!.pointer, "/items/0");
  assert.ok(
    audit.exclusions.some(
      (e) => e.kind === "rule" && e.reason === "test_or_placeholder" && e.sources[0]?.table === 711,
    ),
  );
  assert.ok(audit.exclusions.some((e) => e.kind === "asset"));
  assert.equal(database.assets.filter((a) => a.path === "Entity/NeighborHub/Desk").length, 1);
  assert.ok(!/rowOffset|confirmed|inferred/.test(JSON.stringify(database)));
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
  Reflect.deleteProperty(missing.neighbors[0]!, "storyKeys");
  assert.throws(() => parseNeighborDatabase(missing));
  const dangling = structuredClone(database);
  dangling.neighbors[0]!.rewardItemIds.push(999);
  assert.throws(() => parseNeighborDatabase(dangling));
  const invalidIsland = structuredClone(database);
  invalidIsland.encounterIslands[0]!.neighborIds = [999];
  assert.throws(() => parseNeighborDatabase(invalidIsland));
  const invalidAsset = structuredClone(database);
  invalidAsset.assets[0]!.relatedNeighborIds = [999];
  assert.throws(() => parseNeighborDatabase(invalidAsset));
});

test("independent verification rejects a self-consistent missing neighbor, changed catalog reward and mismatched source", (context) => {
  const fixture = createFixture();
  context.onTestFinished(fixture.cleanup);
  const database = extractNeighbors(fixture.input);
  const missing = structuredClone(database);
  missing.neighbors = missing.neighbors.filter((n) => n.id !== 1005);
  missing.stars = missing.stars.filter((s) => s.npcId !== 1005);
  missing.assets.forEach((a) => {
    a.relatedNeighborIds = a.relatedNeighborIds.filter((id) => id !== 1005);
  });
  parseNeighborDatabase(missing);
  assert.throws(() => verifyNeighbors(missing, fixture.input), /roster/);
  const renamed = structuredClone(database);
  renamed.rewards[0]!.itemNameZh = "错误名称";
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
  const field = tables.fields(row)[11]!;
  tables.reader.b.writeUInt32BE((0x7fffffff ^ profile.wordMask) >>> 0, field);
  assert.throws(() => extractNeighbors(fixture.input), /Invalid string/);
  assert.throws(() => assertLayout(tables, row, { model: [11, "vector"] }, 16), /out of bounds/);
  const rows = fixtureRows();
  rows[643]![0]!.push(1);
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

test("excludes fully configured non-allowlisted neighbors and their exclusive rewards", (context) => {
  const rows = fixtureRows();
  rows[630]!.push(rows[630]![0]!.map((cell, index) => (index === 5 ? 1014 : cell)));
  rows[668]!.push([1014, 1, { text: "图塔故事" }, 1, { text: "正文" }, null]);
  rows[643]!.push([1014, 1, "New_Npc", "1", null, 1, 1, null, { text: "台词" }]);
  rows[180]!.push([6, { text: "图塔主题" }, null, { text: "完成图塔的装修请求" }]);
  const fixture = createFixture(rows);
  context.onTestFinished(fixture.cleanup);
  const item = fixture.input.content.items[0]!;
  assert.equal(item.kind, "item");
  if (item.kind !== "item" || item.category !== "furniture")
    throw new Error("Expected furniture fixture");
  fixture.input.content.items.push(
    { ...item, id: 1129, attributes: { ...item.attributes, sources: "完成图塔的友邻事件" } },
    { ...item, id: 1130, attributes: { ...item.attributes, sources: "完成图塔或云果的友邻事件" } },
  );
  const database = extractNeighbors(fixture.input);
  assert.ok(database.neighbors.every((n) => n.id !== 1014));
  assert.ok(database.stars.every((s) => s.npcId !== 1014));
  assert.ok(database.stories.every((s) => s.npcId !== 1014));
  assert.ok(database.travelReactions.every((r) => r.npcId !== 1014));
  assert.ok(database.furnishingThemes.every((t) => !t.neighborIds.includes(1014)));
  assert.deepEqual(
    database.rewards.map((r) => [r.itemId, r.relatedNeighborIds]),
    [
      [1128, []],
      [1130, [1010]],
    ],
  );
  verifyNeighbors(database, fixture.input);
});
