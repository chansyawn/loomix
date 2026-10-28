import assert from "node:assert/strict";
import path from "node:path";
import { readJson } from "../../workflow/json.ts";
import { islandInput } from "./build.ts";
import { extractIslandBundle } from "./extract.ts";
import { verifyIslands } from "./verify.ts";

export function verifyIslandBundle(bundle: string, staging: string) {
  const input = islandInput(bundle);
  const database = verifyIslands(readJson(path.join(staging, "islands.json")), input);
  const expected = extractIslandBundle(input);
  assert.deepEqual(readJson(path.join(bundle, "island-audit.json")), expected.audit);
  assert.deepEqual(
    readJson(path.join(bundle, "island-exclusions.json")),
    expected.audit.exclusions,
  );
  return database;
}
