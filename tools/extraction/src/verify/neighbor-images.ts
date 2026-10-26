import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import {
  neighborImagePaths,
  parseNeighborImages,
  validateNeighborImages,
  type AdditionalNeighborImage,
  type NeighborDatabase,
} from "@loomix/neighbor-schema";
import type {
  AdditionalNeighborImageExport,
  NeighborImageExport,
} from "../extraction/neighbors/images.ts";
import type { IndexedAsset, SourceAudit } from "../extraction/types.ts";
import { createIconResolver } from "../extraction/images/resolve.ts";
import { selectAdditionalNeighborImages } from "../extraction/neighbors/additional-images.ts";
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
    additionalImages: AdditionalNeighborImageExport[];
    unresolved: { path: string; reason: string }[];
  }>(path.join(bundle, "neighbor-image-audit.json"));
  assert.deepEqual(audit.source, database.source);
  assert.deepEqual(audit.images, originals);
  const additionalOriginals = readJson<AdditionalNeighborImageExport[]>(
    path.join(bundle, "neighbor-additional-image-exports.json"),
  );
  assert.deepEqual(audit.additionalImages, additionalOriginals);
  const references = neighborImagePaths(database);
  const textures = readJson<IndexedAsset[]>(path.join(bundle, "prepared/textures.json"));
  const sprites = readJson<IndexedAsset[]>(path.join(bundle, "prepared/sprites.json"));
  const resolver = createIconResolver(textures, sprites);
  const expectedAdditional = selectAdditionalNeighborImages(textures, sprites);
  assert.deepEqual(
    additionalOriginals.map(
      ({ reference, assetType, resourceName, container, source, pathId, category, npcId }) => ({
        reference,
        assetType,
        resourceName,
        container,
        source,
        pathId,
        category,
        npcId,
      }),
    ),
    expectedAdditional,
    "Additional neighbor image selection must match the frozen indexed manifest",
  );
  assert.equal(
    new Set(additionalOriginals.map((entry) => entry.resourceName)).size,
    additionalOriginals.length,
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
  for (const entry of additionalOriginals) {
    assert.ok(
      sourceAudit.records.some(
        (record) => record.source === entry.source && record.matchesManifest,
      ),
      `Additional neighbor image source audit ${entry.resourceName}`,
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
  const additionalMapping = mapping.additionalImages ?? [];
  const additionalEvidence = readJson<
    {
      key: string;
      category: AdditionalNeighborImage["category"];
      npcId: number | null;
      file: string;
      width: number;
      height: number;
      sha256: string;
      original: AdditionalNeighborImageExport;
    }[]
  >(path.join(reportRoot, "neighbor-additional-image-manifest.json"));
  assert.equal(additionalMapping.length, additionalOriginals.length);
  assert.equal(additionalEvidence.length, additionalOriginals.length);
  for (const entry of additionalMapping) {
    const original = additionalOriginals.find((image) => image.resourceName === entry.key);
    assert.ok(original, `Missing additional neighbor original ${entry.key}`);
    assert.equal(entry.category, original.category);
    assert.equal(entry.npcId, original.npcId);
    const record = additionalEvidence.find((image) => image.key === entry.key);
    assert.ok(record);
    assert.equal(record.category, entry.category);
    assert.equal(record.npcId, entry.npcId);
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
  return [
    ...mapping.images.flatMap((entry) => (entry.image ? [entry.image] : [])),
    ...additionalMapping.map((entry) => entry.image),
  ];
}
