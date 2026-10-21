import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { decodeBytes, decodeTextMapBucket, ObbReader } from "../scripts/obb-reader.mjs";
import { createIconResolver } from "../scripts/icon-resolver.mjs";
import { getOptions, profile, repoRoot } from "../scripts/config.mjs";

const fixtures = JSON.parse(
  fs.readFileSync(new URL("./fixtures/obb-samples.json", import.meta.url)),
);
const runner = fileURLToPath(new URL("../scripts/run.mjs", import.meta.url));

test("real OBB scalar bytes preserve root and signed vtable offsets", () => {
  for (const fixture of fixtures.scalars) {
    const reader = new ObbReader(Buffer.from(fixture.encodedHex, "hex"));
    if (fixture.expectedUnsigned !== undefined)
      assert.equal(reader.u32(0), fixture.expectedUnsigned);
    if (fixture.expectedSigned !== undefined) {
      assert.ok(fixture.expectedSigned < 0);
      assert.equal(reader.i32(0), fixture.expectedSigned);
    }
  }
  assert.equal(new ObbReader(Buffer.alloc(4)).fields(0), null);
});

test("real odd and long string bytes decode exactly", () => {
  for (const fixture of fixtures.samples) {
    const bytes = Buffer.from(fixture.encodedHex, "hex");
    assert.equal(bytes.length, fixture.length);
    assert.equal(decodeBytes(bytes).toString("utf8"), fixture.expected);
  }
  assert.equal(fixtures.samples[0].length, 71);
  assert.equal(fixtures.samples[1].length, 353);
});

test("real TextMap buckets distinguish empty slots and exact indices", () => {
  for (const fixture of fixtures.buckets)
    assert.deepEqual(decodeTextMapBucket(Buffer.from(fixture.encodedHex, "hex")), fixture.expected);
  assert.throws(() => decodeTextMapBucket(Buffer.alloc(4)), /8 bytes/);
});

test("atlas icon requires both exact Sprite path and exact name", () => {
  const reference = "UISprite/Load/MagicChatTable/Img_MagicChatTable_Flower";
  const container = profile.assetPrefix + reference.toLowerCase() + ".png";
  const texture = {
    Container: container,
    Name: "sactx-atlas",
    Source: "C:/game/PetitPlanet_Data/StreamingAssets/a.blk",
    PathID: "1",
  };
  const sprite = {
    Container: container,
    Name: "Img_MagicChatTable_Flower",
    Source: texture.Source,
    PathID: "3",
  };
  const wrong = { ...sprite, Container: "assets/art/ui/flower.png", PathID: "2" };
  const overlay = { ...sprite, Source: "C:/game/PetitPlanet_Data/Persistent/b.blk", PathID: "4" };
  const resolve = createIconResolver([texture], [wrong, sprite, overlay]);
  assert.equal(resolve(reference).pathId, "4");
  assert.equal(resolve(reference).assetType, "Sprite");
  assert.equal(createIconResolver([texture], [wrong])(reference).matched, false);
  assert.equal(
    createIconResolver([texture], [{ ...sprite, Name: "Other" }])(reference).matched,
    false,
  );
});

test("file ID prefixes do not produce icon matches", () => {
  const unrelated = {
    Container: profile.assetPrefix + "uisprite/load/item/16_old_shovel_s.png",
    Name: "16_old_shovel_s",
    Source: "C:/game/a.blk",
    PathID: "1",
  };
  assert.equal(
    createIconResolver([unrelated], [])(profile.expected.prefixCollisionIcon).matched,
    false,
  );
});

test("CLI paths resolve from repository rather than current working directory", () => {
  assert.equal(getOptions(["--", "--step", "validate-catalog"]).step, "validate-catalog");
  assert.equal(
    getOptions(["--output", "resources/custom"]).output,
    path.join(repoRoot, "resources/custom"),
  );
  const result = spawnSync(process.execPath, [runner, "--help"], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1379138/);
});

test("runner rejects unknown steps and reports a failed missing-input step", () => {
  const bad = spawnSync(process.execPath, [runner, "--step", "not-a-step"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown step/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-extraction-test-"));
  try {
    const result = spawnSync(
      process.execPath,
      [runner, "--step", "decode-textmap", "--output", directory],
      { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true },
    );
    assert.equal(result.status, 1);
    const report = JSON.parse(fs.readFileSync(path.join(directory, "run-report.json")));
    assert.equal(report.status, "failed");
    assert.equal(report.steps.length, 1);
    assert.equal(report.steps[0].name, "decode-textmap");
    assert.match(
      fs.readFileSync(path.join(directory, "logs/decode-textmap.log"), "utf8"),
      /run select-config-source first/,
    );
  } finally {
    // 仅删除这些已知的生成文件，避免递归删除。
    fs.rmSync(path.join(directory, "logs/decode-textmap.log"), { force: true });
    fs.rmSync(path.join(directory, "run-report.json"), { force: true });
    fs.rmdirSync(path.join(directory, "logs"));
    fs.rmdirSync(directory);
  }
});
