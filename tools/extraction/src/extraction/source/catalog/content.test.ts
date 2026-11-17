import { createClientGameplayTags } from "../gameplay-tags/client.ts";
import { emptyCatalog, recordSchemas } from "../../schema.ts";
import type { ScalarMethod, TableRow } from "../../types.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import { ObbReader } from "../decode/obb.ts";
import { createIconResolver } from "../../images/resolve.ts";
import { profile } from "../../../profile.ts";
import { repoRoot } from "../../../paths.ts";
import { hashTextKey, readUIntVector, Tables } from "../decode/tables.ts";
import { validateModel, expandTags, furnitureSize, creatureSizeRange } from "./model.ts";
import { safeOutput } from "../../../delivery/output.ts";
import { removeWithin } from "../../../workflow/fs.ts";

const fixtures: {
  scalars: { hex: string; method: ScalarMethod; expected: number }[];
  vector: { hex: string; expected: number[] };
} = JSON.parse(
  fs.readFileSync(new URL("../decode/fixtures/obb-samples.json", import.meta.url), "utf8"),
);
test("actual client bytes preserve the appearance flag and float", () => {
  for (const sample of fixtures.scalars) {
    const b = Buffer.from(sample.hex, "hex"),
      r = new ObbReader(b);
    assert.equal(r.scalar(0, b.length, sample.method), sample.expected);
  }
  assert.equal(fixtures.scalars[0].expected, 1);
  assert.ok(Math.abs(fixtures.scalars[1].expected - 0.8) < 1e-7);
});
test("actual crop product vector references decode with bounds checks", () => {
  const r = new ObbReader(Buffer.from(fixtures.vector.hex, "hex"));
  assert.deepEqual(readUIntVector(r, 0), [30219, 30220, 30221, 30222, 30223]);
  assert.deepEqual(readUIntVector(r, 0), fixtures.vector.expected);
  assert.throws(() => readUIntVector(new ObbReader(r.b.subarray(0, r.b.length - 1)), 0), /length/);
  assert.throws(() => readUIntVector(r, 0, 4), /length/);
  assert.equal(readUIntVector(r, null), null);
});
test("current habitat localization keys and furniture sizes", () => {
  assert.equal(hashTextKey("TagDisplayName_Habitat_Flowers"), 2692302836);
  assert.equal(furnitureSize("尺寸_1_2a5"), "1.0x2.5");
  assert.equal(furnitureSize("大"), null);
});
test("creature ranges apply the configured factor and normalize float precision", () => {
  assert.equal(creatureSizeRange(30, 50, 0.05000000074505806), "1.5–2.5厘");
  assert.equal(creatureSizeRange(23, 38, 0.20000000298023224), "4.6–7.6厘");
  assert.equal(creatureSizeRange(26, 46, 0.20000000298023224), "5.2–9.2厘");
  assert.equal(creatureSizeRange(20, 40, 0.699999988079071), "14–28厘");
  assert.equal(creatureSizeRange(null, 120, 0.6), null);
  assert.throws(() => creatureSizeRange(120, 60, 0.6), /minimum size/);
  assert.throws(() => creatureSizeRange(1, 2, 0.005), /two decimal places/);
});
test("tag ancestry preserves class membership and detects cycles", () => {
  const nodes = {
    1: { TagId: 1, TagName: "家具", ParentId: 4294967295 },
    2: { TagId: 2, TagName: "盆栽", ParentId: 1 },
  };
  assert.deepEqual(
    [...expandTags(["盆栽"], createClientGameplayTags(nodes, {}, { key: () => null }).index)],
    ["盆栽", "家具"],
  );
  nodes[1].ParentId = 2;
  assert.throws(
    () => expandTags(["盆栽"], createClientGameplayTags(nodes, {}, { key: () => null }).index),
    /cycle/,
  );
});
test("field whitelist and same-category member references are strict", () => {
  const content = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  const item = recordSchemas["furniture.item"].parse({
    id: 1101,
    name: "手工图桌",
    quality: 0,
    image: null,
    description: null,
    encyclopediaEntry: { listed: true },
    category: "furniture",
    kind: "item",
    subcategory: "桌",
    attributes: { type: null, size: null, colors: null, materials: null },
  });
  const set = recordSchemas["furniture.set"].parse({
    id: 3,
    name: "套组",
    quality: 2,
    image: null,
    description: null,
    encyclopediaEntry: { listed: true },
    category: "furniture",
    kind: "set",
    memberIds: [1101],
  });
  content.items.push(item, set);
  assert.equal(validateModel(content, [3, 1101], null, new Set([0, 2])).all.length, 2);
  assert.throws(() => validateModel(content, [3]), /Exact confirmed catalog membership/);
  assert.throws(() => validateModel(content, [3, 1101], { "furniture.set": 2 }), /count/);
  assert.throws(() => validateModel(content, [3, 1101], null, new Set([0])), /quality/);
  Object.assign(item, { source: "extra" });
  assert.throws(() => validateModel(content, [3, 1101]), { name: "ZodError" });
  Reflect.deleteProperty(item, "source");
  set.memberIds = [999];
  assert.throws(() => validateModel(content, [3, 1101]), { name: "ZodError" });
  set.memberIds = null;
  content.items.push({ ...item });
  assert.throws(() => validateModel(content, [3, 1101]));
});
test("duplicate table IDs require equal extracted values", () => {
  let rows: TableRow[] = [
    { root: 1, rowOffset: 1 },
    { root: 1, rowOffset: 2 },
  ];
  const t = { rows: () => rows, uint: () => 1 };
  const signature = (row: TableRow) => row.rowOffset;
  assert.throws(() => Tables.prototype.byId.call(t, 325, signature), /Conflicting/);
  rows = [
    { root: 1, rowOffset: 1 },
    { root: 1, rowOffset: 1 },
  ];
  assert.equal(Tables.prototype.byId.call(t, 325, signature).size, 1);
});

test("mismatched configuration revision is rejected before reading tables", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "petit-version-test-"));
  try {
    fs.writeFileSync(
      path.join(temp, "active-config-source.json"),
      JSON.stringify({
        dataRevision: profile.dataRevision - 1,
        files: [{ matchesManifest: true }],
      }),
    );
    assert.throws(() => new Tables(temp), /Unverified configuration/);
  } finally {
    removeWithin(temp, os.tmpdir());
  }
});
test("same-name sprites use precise containers and isolated export batches", () => {
  const reference = "UISprite/Load/Test/Flower";
  const right = {
    Name: "Flower",
    Container: `${profile.assetPrefix}${reference.toLowerCase()}.png`,
    Source: "C:/client/Persistent/a.blk",
    PathID: "10",
  };
  const wrong = { ...right, Container: "assets/art/flower.png", PathID: "11" };
  assert.equal(createIconResolver([], [wrong, right])(reference)?.pathId, "10");
});
test("output protects shared client and caches", () => {
  for (const relative of ["resources/game-client", "var", "tools"])
    assert.throws(() => safeOutput(path.join(repoRoot, relative)), /Unsafe/);
});
