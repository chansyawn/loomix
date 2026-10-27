import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { createFixture, type FixtureRows } from "../neighbors/fixtures/tables.ts";
import { extractIslandBundle, islandStatus } from "./extract.ts";
import { verifyIslands } from "./verify.ts";

test("retains the full 90-row table with stable icon joins and null uncertain associations", (context) => {
  const rows = Array.from({ length: 90 }, (_, index) => {
    const row: FixtureRows[number][number] = Array<null>(28).fill(null);
    row[0] = index + 1;
    row[1] = { text: `岛屿${index + 1}` };
    row[16] = 710000000 + index;
    row[17] = (index % 15) + 1;
    row[18] = "DEFAULT";
    row[25] = null;
    row[26] = null;
    return row;
  });
  const icons = Array.from({ length: 15 }, (_, index) => [
    index + 1,
    { text: `类型${index + 1}` },
    `UISprite/Icon_${index + 1}`,
    "Entity/Island.prefab",
    `UISprite/Icon_${index + 1}_b`,
  ]);
  const regions = Array.from({ length: 3 }, (_, index) => [
    index + 1,
    1,
    null,
    index + 1,
    { text: `区域${index + 1}` },
    1001 + index,
    null,
    null,
    null,
    null,
    null,
    null,
    "UISprite/Map_SDF",
    "UISprite/Station",
  ]);
  const fixture = createFixture({ 628: icons, 652: regions, 654: rows.reverse() });
  context.onTestFinished(fixture.cleanup);
  const result = extractIslandBundle(fixture.input);
  assert.equal(result.database.islands.length, 90);
  assert.equal(result.database.islandIconStyles.length, 15);
  assert.equal(result.database.regions.length, 3);
  assert.deepEqual(
    result.database.islands.map((island) => island.id),
    Array.from({ length: 90 }, (_, index) => index + 1),
  );
  assert.ok(result.database.islands.every((island) => island.galaxyId === null));
  assert.ok(result.database.islands.every((island) => island.regionId === null));
  for (const island of result.database.islands) {
    assert.equal(island.iconStyleId, ((island.id - 1) % 15) + 1);
    assert.equal(island.illustrationPath, null);
    assert.deepEqual(island.displayCreatureIds, []);
    assert.deepEqual(island.displaySpecialtyIds, []);
  }
});

test("extracts all island fields, style joins and audited status decisions", (context) => {
  const islandRow = (id: number, name: string): FixtureRows[number][number] => {
    const row: FixtureRows[number][number] = Array<null>(28).fill(null);
    row[0] = id;
    row[1] = { text: name };
    row[16] = 710000000 + id;
    row[17] = 1;
    row[18] = "DEFAULT";
    row[22] = 1;
    row[25] = "41011,99999,41011";
    row[26] = "1128,1128";
    row[27] = " UISprite\\Island.png ";
    return row;
  };
  const fixture = createFixture({
    628: [
      [1, { text: "河鱼" }, "UISprite/Icon_River", "Entity/Island.prefab", "UISprite/Icon_River_b"],
    ],
    652: [
      [
        1,
        1,
        null,
        1,
        { text: "禾夏 H83 区" },
        1001,
        null,
        null,
        null,
        null,
        null,
        null,
        "UISprite/Map_SDF",
        "UISprite/Station",
      ],
    ],
    654: [islandRow(1, "正式岛屿"), islandRow(2, "邂逅·旧岛"), islandRow(3, "玩法测试星屿")],
  });
  fixture.input.content.items.push({
    id: 41011,
    name: "太阳鱼",
    image: null,
    description: null,
    quality: 1,
    encyclopediaEntry: null,
    category: "creatures",
    kind: "item",
    subcategory: null,
    attributes: {
      region: null,
      habitat: null,
      activeSeasons: null,
      activeTimes: null,
      activeWeather: null,
      sizeRange: null,
    },
  });
  context.onTestFinished(fixture.cleanup);
  const result = extractIslandBundle({
    tables: fixture.input.tables,
    content: fixture.input.content,
    source: fixture.input.source,
  });
  assert.deepEqual(
    result.database.islands.map((island) => [island.id, island.status, island.iconStyleId]),
    [
      [1, "default", 1],
      [2, "encounter", 1],
      [3, "test", 1],
    ],
  );
  assert.deepEqual(result.database.islands[0]!.displayCreatureIds, [41011]);
  assert.deepEqual(result.database.islands[0]!.displaySpecialtyIds, [1128]);
  assert.equal(result.database.islands[0]!.regionId, null);
  assert.equal(result.database.islands[0]!.illustrationPath, "UISprite/Island.png");
  assert.equal(result.audit.exclusions.length, 3);
  assert.ok(result.audit.exclusions.every((entry) => entry.value === 99999));
  assert.equal(result.audit.catalogReferences.length, 6);
  assert.equal(result.audit.counts.islands, 3);
  assert.equal(
    verifyIslands(result.database, {
      tables: fixture.input.tables,
      content: fixture.input.content,
      source: fixture.input.source,
    }).islands.length,
    3,
  );
  const altered = structuredClone(result.database);
  altered.islands[2]!.status = "default";
  assert.throws(() => verifyIslands(altered, fixture.input), /differs from frozen/);
});

test("status markers override the default state and unknown states stay unconfirmed", () => {
  assert.equal(islandStatus("玩法测试星屿", "DEFAULT"), "test");
  assert.equal(islandStatus("邂逅·旧岛", "DEFAULT"), "encounter");
  assert.equal(islandStatus("未命名岛", "RETIRED"), "unconfirmed");
  assert.equal(islandStatus("占位岛", "DEFAULT"), "placeholder");
});

test("invalid icon styles, item lists, paths and duplicate island IDs are rejected", (context) => {
  const rows = {
    628: [
      [1, { text: "河鱼" }, "UISprite/Icon_River", "Entity/Island.prefab", "UISprite/Icon_River_b"],
    ],
    652: [],
    654: (() => {
      const row: FixtureRows[number][number] = Array<null>(28).fill(null);
      row[0] = 1;
      row[1] = { text: "岛屿" };
      row[16] = 710000001;
      row[17] = 2;
      row[18] = "DEFAULT";
      row[27] = "../escape.png";
      return [row];
    })(),
  } satisfies FixtureRows;
  const fixture = createFixture(rows);
  context.onTestFinished(fixture.cleanup);
  assert.throws(() => extractIslandBundle(fixture.input), /Unknown island icon style/);
  rows[654][0]![17] = 1;
  const badPath = createFixture(rows);
  context.onTestFinished(badPath.cleanup);
  assert.throws(() => extractIslandBundle(badPath.input), /Invalid/);
  rows[654][0]![27] = null;
  rows[654][0]![25] = "41011,invalid";
  const badList = createFixture(rows);
  context.onTestFinished(badList.cleanup);
  assert.throws(() => extractIslandBundle(badList.input), /Invalid island item list/);
  rows[654][0]![25] = null;
  rows[654].push([...rows[654][0]!]);
  const duplicate = createFixture(rows);
  context.onTestFinished(duplicate.cleanup);
  assert.throws(() => extractIslandBundle(duplicate.input), /sorted and unique/);
});
