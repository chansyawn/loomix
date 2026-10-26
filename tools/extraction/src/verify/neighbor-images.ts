import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import {
  neighborImagePaths,
  parseNeighborImages,
  validateNeighborImages,
  type NeighborDatabase,
} from "@loomix/neighbor-schema";
import type { NeighborImageExport } from "../extraction/neighbors/images.ts";
import type { IndexedAsset, SourceAudit } from "../extraction/types.ts";
import { createIconResolver } from "../extraction/images/resolve.ts";
import { readJson } from "../workflow/json.ts";
import { within } from "../paths.ts";
import { decodeWebp } from "../delivery/image.ts";

export async function verifyNeighborImages(
  database: NeighborDatabase,
  bundle: string,
  staging: string,
  reportRoot: string,
  raw: boolean,
): Promise<string[]> {
  const originals = readJson<NeighborImageExport[]>(
    path.join(bundle, "neighbor-image-exports.json"),
  );
  const audit = readJson<{
    source: NeighborDatabase["source"];
    images: NeighborImageExport[];
    unresolved: { path: string; reason: string }[];
  }>(path.join(bundle, "neighbor-image-audit.json"));
  assert.deepEqual(audit.source, database.source);
  assert.deepEqual(audit.images, originals);
  const references = neighborImagePaths(database);
  const resolver = createIconResolver(
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/textures.json")),
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/sprites.json")),
  );
  assert.equal(new Set(originals.map((entry) => entry.reference)).size, originals.length);
  assert.deepEqual(
    [
      ...originals.map((entry) => entry.reference),
      ...audit.unresolved.map((entry) => entry.path),
    ].sort(),
    references,
  );
  const sourceAudit = readJson<SourceAudit>(path.join(bundle, "source-audit.json"));
  for (const entry of originals) {
    const match = resolver(entry.reference);
    assert.ok(match?.matched);
    for (const key of ["source", "pathId", "container", "resourceName", "assetType"] as const)
      assert.equal(entry[key], match[key], `Neighbor indexed resource ${entry.reference}/${key}`);
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
    assert.equal(decoded.data.length, entry.width * entry.height * 4);
  }
  for (const missing of audit.unresolved) {
    assert.ok(missing.reason);
    assert.ok(!resolver(missing.path)?.matched, "Indexed image must not be silently omitted");
  }
  if (raw) return [];
  const mapping = parseNeighborImages(readJson(path.join(staging, "neighbor-images.json")));
  validateNeighborImages(database, mapping);
  const evidence = readJson<
    {
      path: string;
      file: string;
      width: number;
      height: number;
      sha256: string;
      original: NeighborImageExport;
    }[]
  >(path.join(reportRoot, "neighbor-image-manifest.json"));
  assert.equal(evidence.length, originals.length);
  for (const entry of mapping.images) {
    const original = originals.find((image) => image.reference === entry.path);
    if (!original) {
      assert.equal(entry.image, null);
      continue;
    }
    assert.ok(entry.image);
    const record = evidence.find((image) => image.path === entry.path);
    assert.ok(record);
    assert.deepEqual(record.original, original);
    assert.equal(record.file, entry.image);
    const bytes = fs.readFileSync(within(staging, entry.image));
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.equal(entry.image, `assets/${hash}.webp`);
    assert.equal(record.sha256, hash);
    const decoded = await decodeWebp(bytes);
    const scale = Math.min(1, 1600 / Math.max(original.width, original.height));
    assert.ok(Math.abs(decoded.width - original.width * scale) <= 1);
    assert.ok(Math.abs(decoded.height - original.height * scale) <= 1);
    assert.equal(decoded.width, record.width);
    assert.equal(decoded.height, record.height);
  }
  return mapping.images.flatMap((entry) => (entry.image ? [entry.image] : []));
}
