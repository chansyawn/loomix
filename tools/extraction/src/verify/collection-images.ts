import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import type { CollectionObservations } from "@loomix/schema/extraction";
import type { ImageManifest, SelectedImage, SourceAudit } from "../extraction/types.ts";
import { readJson } from "../workflow/json.ts";
import { within } from "../paths.ts";
import { assetKey, highestResolutionImages } from "../extraction/images/select.ts";
import { Tables } from "../extraction/decode/tables.ts";
import { createIconResolver } from "../extraction/images/resolve.ts";
import type { IndexedAsset } from "../extraction/types.ts";

export async function verifySeedImages(
  catalog: CollectionObservations,
  bundle: string,
): Promise<void> {
  const candidates = readJson<SelectedImage[]>(path.join(bundle, "seed-image-candidates.json"));
  const originals = readJson<ImageManifest[]>(path.join(bundle, "seed-image-originals.json"));
  const selected = readJson<ImageManifest[]>(path.join(bundle, "seed-image-manifest.json"));
  const tables = new Tables(path.join(bundle, "prepared"));
  const resolver = createIconResolver(
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/textures.json")),
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/sprites.json")),
  );
  const expectedCandidates: SelectedImage[] = [];
  for (const seed of catalog.cropSeeds) {
    const row = tables.rows(325).find((row) => tables.uint(row, 0) === seed.id);
    for (const field of [5, 4]) {
      const reference = tables.string(row, field);
      const asset = reference ? resolver(reference) : null;
      if (asset?.matched && asset.source && asset.pathId && asset.container && asset.resourceName)
        expectedCandidates.push({
          id: seed.id,
          group: "plants.item",
          reference: reference!,
          source: asset.source,
          pathId: asset.pathId,
          container: asset.container,
          resourceName: asset.resourceName,
          assetType: asset.assetType,
        });
    }
  }
  assert.deepEqual(candidates, expectedCandidates, "Independent seed icon candidates");
  const expected = highestResolutionImages(candidates, originals);
  assert.equal(selected.length, catalog.cropSeeds.length, "One selected image per seed");
  assert.equal(new Set(selected.map((image) => image.id)).size, selected.length);
  assert.equal(originals.length, candidates.length, "Every seed image candidate exported");
  const sources = readJson<SourceAudit>(path.join(bundle, "source-audit.json"));
  for (const original of originals) {
    assert.ok(
      candidates.some(
        (candidate) => candidate.id === original.id && assetKey(candidate) === assetKey(original),
      ),
    );
    assert.ok(
      sources.records.some((source) => source.source === original.source && source.matchesManifest),
    );
    const bytes = fs.readFileSync(within(bundle, original.file));
    const png = PNG.sync.read(bytes, { checkCRC: true });
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), original.sha256);
    assert.equal(png.width, original.width);
    assert.equal(png.height, original.height);
    assert.equal(png.data.length, png.width * png.height * 4);
  }
  for (const seed of catalog.cropSeeds) {
    const original = selected.find((image) => image.id === seed.id);
    const preferred = expected.find((image) => image.id === seed.id);
    const image = selected.find((image) => image.id === seed.id);
    assert.ok(original && preferred && image, `Seed image ${seed.id}`);
    assert.equal(assetKey(original), assetKey(preferred), "Highest resolution seed icon");
    assert.equal(original.reference, preferred.reference);
    assert.ok(
      originals.some(
        (candidate) =>
          candidate.id === seed.id &&
          candidate.file === original.file &&
          candidate.sha256 === original.sha256,
      ),
    );
    assert.equal(seed.image, image.file);
  }
}

export async function verifyStageImages(
  catalog: CollectionObservations,
  bundle: string,
): Promise<void> {
  const candidates = readJson<SelectedImage[]>(path.join(bundle, "stage-image-candidates.json"));
  const originals = readJson<ImageManifest[]>(path.join(bundle, "stage-image-originals.json"));
  const selected = readJson<ImageManifest[]>(path.join(bundle, "stage-image-manifest.json"));
  const ids = new Set<number>();
  for (const seed of catalog.cropSeeds)
    for (const stage of seed.detail.growth?.stages ?? []) ids.add(stage.id);
  for (const detail of catalog.details)
    for (const stage of detail.growth?.stages ?? []) ids.add(stage.id);
  for (const id of candidates.map((candidate) => candidate.id))
    assert.ok(ids.has(id), `Unreferenced stage image candidate ${id}`);
  assert.equal(new Set(originals.map((image) => assetKey(image))).size, originals.length);
  for (const candidate of candidates)
    assert.ok(originals.some((image) => assetKey(image) === assetKey(candidate)));
  assert.equal(selected.length, new Set(candidates.map((candidate) => candidate.id)).size);
  for (const image of originals) {
    const bytes = fs.readFileSync(within(bundle, image.file));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), image.sha256);
    const png = PNG.sync.read(bytes, { checkCRC: true });
    assert.equal(png.width, image.width);
    assert.equal(png.height, image.height);
  }
}
