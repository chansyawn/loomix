import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readJson } from "../../workflow/json.ts";
import { islandInput } from "./build.ts";
import { extractIslandBundle } from "./extract.ts";
import { verifyIslands } from "./verify.ts";

export function verifyIslandBundle(bundle: string, staging: string, raw: boolean) {
  const enabled = [
    "raw/islands.json",
    "island-audit.json",
    "island-image-exports.json",
    "checkpoints/islands.json",
  ].some((file) => fs.existsSync(path.join(bundle, file)));
  // Frozen extractions from before island support remain usable, but cannot introduce new data.
  if (!enabled) {
    for (const file of ["islands.json", "islands-images.json"])
      assert.ok(!fs.existsSync(path.join(staging, file)), `Unexpected legacy bundle file ${file}`);
    return null;
  }
  const input = islandInput(bundle);
  const database = verifyIslands(readJson(path.join(staging, "islands.json")), input);
  const expected = extractIslandBundle(input);
  assert.deepEqual(readJson(path.join(bundle, "island-audit.json")), expected.audit);
  assert.deepEqual(
    readJson(path.join(bundle, "island-exclusions.json")),
    expected.audit.exclusions,
  );
  if (!raw)
    assert.deepEqual(
      fs.readFileSync(path.join(staging, "islands.json")),
      fs.readFileSync(path.join(bundle, "raw/islands.json")),
      "Delivered island bytes must match extraction",
    );
  return database;
}
