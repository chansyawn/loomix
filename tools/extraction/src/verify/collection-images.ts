import type { PlantImageAudit } from "../extraction/plants/images.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import type { CollectionObservations } from "../extraction/schema.ts";
import type {
  ImageManifest,
  SelectedImage,
  SourceAudit,
  IndexedAsset,
} from "../extraction/types.ts";
import { readJson } from "../workflow/json.ts";
import { within } from "../paths.ts";
import { assetKey, highestResolutionImages } from "../extraction/images/select.ts";
import { Tables } from "../extraction/decode/tables.ts";
import { createIconResolver } from "../extraction/images/resolve.ts";

function verifyImages(
  bundle: string,
  kind: "seed" | "stage",
  records: readonly { id: number; image: string | null }[],
) {
  const candidates = readJson<SelectedImage[]>(path.join(bundle, `${kind}-image-candidates.json`));
  const originals = readJson<ImageManifest[]>(path.join(bundle, `${kind}-image-originals.json`));
  const selected = readJson<ImageManifest[]>(path.join(bundle, `${kind}-image-manifest.json`));
  const tables = new Tables(path.join(bundle, "prepared"));
  const resolver = createIconResolver(
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/textures.json")),
    readJson<IndexedAsset[]>(path.join(bundle, "prepared/sprites.json")),
  );
  const expectedCandidates: SelectedImage[] = [];
  const audit: PlantImageAudit[] = [];
  for (const record of records) {
    const row = tables.rows(325).find((row) => tables.id(row) === record.id);
    const references = [5, 4].map((field) => {
      const reference = tables.string(row, field);
      return { field, reference, match: reference ? resolver(reference) : null };
    });
    const matched = references.some((entry) => entry.match?.matched);
    audit.push({
      kind,
      id: record.id,
      rowOffset: row?.rowOffset ?? null,
      references,
      reason: matched
        ? null
        : !row
          ? "missing_display_row"
          : references.some((entry) => entry.reference)
            ? "no_exact_indexed_image_match"
            : "image_not_configured",
    });
    for (const field of [5, 4]) {
      const reference = tables.string(row, field),
        asset = reference ? resolver(reference) : null;
      if (asset?.matched && asset.source && asset.pathId && asset.container && asset.resourceName)
        expectedCandidates.push({
          id: record.id,
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
  assert.deepEqual(
    readJson<PlantImageAudit[]>(path.join(bundle, "plant-image-audit.json")).filter(
      (entry) => entry.kind === kind,
    ),
    audit,
    "Independent image configuration audit",
  );
  assert.deepEqual(
    readJson(path.join(bundle, "evidence/plant-image-audit.json")),
    readJson(path.join(bundle, "plant-image-audit.json")),
    "Preserved image audit",
  );
  assert.deepEqual(candidates, expectedCandidates, `Independent ${kind} image candidates`);
  const expected = highestResolutionImages(candidates, originals);
  assert.equal(selected.length, expected.length);
  assert.equal(new Set(selected.map((image) => image.id)).size, selected.length);
  assert.deepEqual(
    new Set(originals.map(assetKey)),
    new Set(candidates.map(assetKey)),
    "Every unique configured object exported",
  );
  assert.equal(
    originals.length,
    new Set(originals.map(assetKey)).size,
    "Raw objects are deduplicated",
  );
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
  for (const record of records) {
    const preferred = expected.find((image) => image.id === record.id);
    const image = selected.find((image) => image.id === record.id);
    if (!preferred) {
      assert.equal(record.image, null);
      continue;
    }
    assert.ok(image);
    assert.equal(assetKey(image), assetKey(preferred), "Highest native resolution");
    assert.equal(image.reference, preferred.reference);
    assert.ok(
      originals.some(
        (original) =>
          assetKey(original) === assetKey(image) &&
          original.file === image.file &&
          original.sha256 === image.sha256,
      ),
    );
    assert.equal(record.image, image.file);
  }
}

export function verifySeedImages(catalog: CollectionObservations, bundle: string): void {
  verifyImages(bundle, "seed", catalog.seeds);
}
export function verifyStageImages(catalog: CollectionObservations, bundle: string): void {
  const stages = [
    ...new Map(
      catalog.growths.flatMap((growth) => growth.stages).map((stage) => [stage.id, stage]),
    ).values(),
  ].sort((a, b) => a.id - b.id);
  verifyImages(bundle, "stage", stages);
}
