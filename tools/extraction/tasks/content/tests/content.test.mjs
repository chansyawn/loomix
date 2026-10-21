import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ObbReader } from "../scripts/obb-reader.mjs";
import { createIconResolver } from "../scripts/icon-resolver.mjs";
import { getOptions, profile, repoRoot } from "../scripts/config.mjs";
import { hashTextKey, readUIntVector, Tables } from "../scripts/table-reader.mjs";
import {
  additionalFields,
  emptyContent,
  validateModel,
  expandTags,
  furnitureSize,
} from "../scripts/model.mjs";
import { imageBatches, assets } from "../scripts/assets.mjs";
import { safeOutput } from "../scripts/run.mjs";
import { removeWithin } from "../scripts/io.mjs";

const fixtures = JSON.parse(
  fs.readFileSync(new URL("./fixtures/obb-samples.json", import.meta.url)),
);
const runner = fileURLToPath(new URL("../scripts/run.mjs", import.meta.url));
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
test("tag ancestry preserves class membership and detects cycles", () => {
  const nodes = {
    1: { TagId: 1, TagName: "家具", ParentId: 0 },
    2: { TagId: 2, TagName: "盆栽", ParentId: 1 },
  };
  assert.deepEqual([...expandTags(["盆栽"], nodes)], ["盆栽", "家具"]);
  nodes[1].ParentId = 2;
  assert.throws(() => expandTags(["盆栽"], nodes), /cycle/);
});
test("field whitelist and same-category member references are strict", () => {
  const content = emptyContent();
  const item = Object.fromEntries(
    ["name", "image", "description", "id", "quality", ...additionalFields["furniture.items"]].map(
      (k) => [k, null],
    ),
  );
  Object.assign(item, { id: 1101, name: "手工图桌", quality: 0 });
  content.furniture.items.push(item);
  content.furniture.sets.push({
    name: "套组",
    image: null,
    description: null,
    id: 3,
    quality: 2,
    seriesName: "套组",
    componentIds: [1101],
  });
  assert.equal(validateModel(content, [3, 1101], null, new Set([0, 2])).all.length, 2);
  assert.throws(() => validateModel(content, [3]), /Exact root 93 membership/);
  assert.throws(() => validateModel(content, [3, 1101], { "furniture.sets": 2 }), /count/);
  assert.throws(() => validateModel(content, [3, 1101], null, new Set([0])), /quality/);
  item.source = "extra";
  assert.throws(() => validateModel(content, [3, 1101]), { name: "ZodError" });
  delete item.source;
  content.furniture.sets[0].componentIds = [999];
  assert.throws(() => validateModel(content, [3, 1101]), { name: "ZodError" });
  content.furniture.sets[0].componentIds = null;
  content.clothing.items.push({ ...item });
  assert.throws(() => validateModel(content, [3, 1101]));
});
test("duplicate table IDs require equal extracted values", () => {
  const t = Object.create(Tables.prototype);
  t.rows = () => [
    { id: 1, v: "a" },
    { id: 1, v: "b" },
  ];
  t.uint = (r) => r.id;
  assert.throws(() => t.byId(325, (r) => r.v), /Conflicting/);
  t.rows = () => [
    { id: 1, v: "a" },
    { id: 1, v: "a" },
  ];
  assert.equal(t.byId(325, (r) => r.v).size, 1);
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
  assert.equal(createIconResolver([], [wrong, right])(reference).pathId, "10");
  const batches = imageBatches(
    [right, wrong].map((a) => ({
      source: a.Source,
      assetType: "Sprite",
      resourceName: a.Name,
      container: a.Container,
      pathId: a.PathID,
    })),
  );
  assert.equal(batches.length, 2);
  assert.ok(batches.every((b) => b.length === 1));
});
test("paths are independent of cwd and protect shared inputs", () => {
  const options = getOptions([]);
  assert.equal(options.output, path.join(repoRoot, "resources/website"));
  assert.equal(
    path.dirname(options.work),
    path.join(repoRoot, "resources/temp/extraction/content"),
  );
  assert.equal(profile.paths.gameRoot, "resources/game-client/PetitPlanet_Data");
  assert.equal(profile.paths.assetMap, "resources/temp/extraction/index/assets_map.xml");
  assert.equal(
    getOptions(["--output", "resources/temp/sample-content"]).output,
    path.join(repoRoot, "resources/temp/sample-content"),
  );
  assert.throws(() => safeOutput(path.join(repoRoot, "resources/temp/extraction/index")), /Unsafe/);
  assert.throws(() => safeOutput(path.join(repoRoot, "resources/GAME-CLIENT")), /Unsafe/);
  for (const relative of [
    "resources/extraction-tools",
    "resources/temp/extraction",
    "resources/temp/extraction/content/unused",
    "resources/temp",
    "tools",
  ])
    assert.throws(() => safeOutput(path.join(repoRoot, relative)), /Unsafe/);
  const result = spawnSync(process.execPath, [runner, "--help"], {
    cwd: os.tmpdir(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /prepare, structure, assets, audit, validate, publish/);
  assert.match(result.stdout, /默认输出：resources\/website\//);
  const unknown = spawnSync(process.execPath, [runner, "--step", "unknown"], { encoding: "utf8" });
  assert.notEqual(unknown.status, 0);
});
test("failed single step preserves existing deliverables and retains report", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "petit-content-test-"));
  const output = path.join(temp, "output"),
    options = getOptions(["--output", output]);
  fs.mkdirSync(path.join(output, "assets"), { recursive: true });
  fs.writeFileSync(path.join(output, "content.json"), "original");
  try {
    const result = spawnSync(process.execPath, [runner, "--output", output, "--step", "publish"], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(path.join(output, "content.json"), "utf8"), "original");
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(options.work, "run-report.json"))).status,
      "failed",
    );
    assert.throws(() => removeWithin(temp, temp), /Unsafe/);
  } finally {
    removeWithin(temp, os.tmpdir());
    removeWithin(options.work, path.dirname(options.work));
  }
});

test("export failures and missing selected PNGs stop with logs", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "petit-export-test-"));
  try {
    for (const code of [7, 0]) {
      const work = path.join(temp, String(code)),
        source = path.join(temp, `export-${code}.mjs`);
      fs.mkdirSync(path.join(work, "staging", "assets"), { recursive: true });
      fs.writeFileSync(path.join(work, "staging", "content.json"), JSON.stringify(emptyContent()));
      fs.writeFileSync(
        path.join(work, "selected-images.json"),
        JSON.stringify([
          {
            id: 1101,
            source,
            assetType: "Sprite",
            pathId: "1",
            resourceName: "Expected",
            container: "exact/path",
            reference: "UISprite/Expected",
          },
        ]),
      );
      await assert.rejects(
        assets({ work }, async (request) => {
          assert.equal(request.input, source);
          assert.deepEqual(request.types, ["Sprite"]);
          assert.deepEqual(request.names, ["^(?:Expected)$"]);
          assert.deepEqual(request.containers, ["^(?:exact/path)$"]);
          fs.mkdirSync(path.dirname(request.logFile), { recursive: true });
          fs.writeFileSync(request.logFile, "export fixture");
          if (code) throw new Error("Extraction failed");
        }),
        code ? /Extraction failed/ : /not exported/,
      );
      const log = fs.readdirSync(path.join(work, "logs"))[0];
      assert.match(fs.readFileSync(path.join(work, "logs", log), "utf8"), /export fixture/);
    }
  } finally {
    removeWithin(temp, os.tmpdir());
  }
});
