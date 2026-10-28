import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { islandImagePaths, parseIslandDatabase } from "./schema.ts";
import { PNG } from "pngjs";
import type { IndexedAsset, SourceAudit } from "../types.ts";
import { createIslandImageResolver } from "./resolve-images.ts";
import { readJson } from "../../workflow/json.ts";
import { within } from "../../paths.ts";
import type { IslandImageExport } from "./images.ts";

export async function verifyIslandImages(
  database: ReturnType<typeof parseIslandDatabase>,
  bundle: string,
): Promise<void> {
  const originals = readJson<IslandImageExport[]>(path.join(bundle, "island-image-exports.json"));
  const audit = readJson<{
    source: typeof database.source;
    references: number;
    images: IslandImageExport[];
    matches?: { path: string; method: string | null }[];
    unresolved: { path: string; reason: string }[];
  }>(path.join(bundle, "island-image-audit.json"));
  assert.deepEqual(audit.source, database.source);
  assert.deepEqual(audit.images, originals);
  assert.deepEqual(
    [
      ...originals.map((entry) => entry.reference),
      ...audit.unresolved.map((entry) => entry.path),
    ].sort(),
    islandImagePaths(database),
  );
  const resolver = createIslandImageResolver(
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/textures.json")),
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/sprites.json")),
  );
  const sourceAudit = readJson<SourceAudit>(path.join(bundle, "source-audit.json"));
  for (const entry of originals) {
    const match = resolver(entry.reference);
    assert.ok(match?.matched);
    for (const key of ["source", "pathId", "container", "resourceName", "assetType"] as const)
      assert.equal(entry[key], match[key]);
    assert.ok(
      sourceAudit.records.some(
        (record) => record.source === entry.source && record.matchesManifest,
      ),
    );
    const bytes = fs.readFileSync(within(bundle, entry.file));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), entry.sha256);
    const decoded = PNG.sync.read(bytes, { checkCRC: true });
    assert.equal(decoded.width, entry.width);
    assert.equal(decoded.height, entry.height);
  }
  for (const missing of audit.unresolved) assert.ok(!resolver(missing.path)?.matched);
}
