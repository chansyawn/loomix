import type {
  WorkOptions,
  ImageManifest,
  ProcessedImage,
  SelectedImage,
  SourceAudit,
  EvidenceRecord,
  FieldValue,
} from "./types.ts";
import type { ContentRecord } from "@loomix/content-schema";
import { parseContent, contentGroups } from "@loomix/content-schema";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { profile } from "./config.ts";
import { Tables } from "./table-reader.ts";
import { readJson, writeJson } from "./io.ts";
import { additionalFields, basicFields, groupAt, validateModel } from "./model.ts";
import { highestResolutionImages } from "./assets.ts";
import { decodeWebp, imageDimensions } from "./image-processing.ts";

function fieldValue(row: ContentRecord, field: string): FieldValue | undefined {
  const values: Record<string, FieldValue> = row;
  return values[field];
}

export async function validate(options: WorkOptions) {
  const staging = path.join(options.work, "staging"),
    contentFile = path.join(staging, "content.json");
  const content = parseContent(readJson(contentFile)),
    tables = new Tables(path.join(options.work, "prepared"));
  const scope = tables.rows(profile.roots.content).map((r) => tables.id(r));
  assert.deepEqual(
    scope.slice().sort((a, b) => a - b),
    readJson(path.join(options.work, "scope.json")),
    "Fresh root 93 ID set",
  );
  const qualities = new Set(tables.rows(profile.roots.qualities).map((r) => tables.uint(r, 1, 0)));
  const { all, counts } = validateModel(content, scope, profile.expectedContent, qualities);
  const manifest = readJson<ProcessedImage[]>(path.join(options.work, "image-manifest.json"));
  const selected = readJson<SelectedImage[]>(path.join(options.work, "selected-images.json"));
  assert.deepEqual(
    selected,
    highestResolutionImages(
      readJson<SelectedImage[]>(path.join(options.work, "candidate-images.json")),
      readJson<ImageManifest[]>(path.join(options.work, "image-candidates.json")),
    ),
    "Highest native resolution for every image",
  );
  const nativeImages = readJson<ImageManifest[]>(path.join(options.work, "image-candidates.json"));
  const records = new Map(all.map((r) => [r.id, r]));
  for (const a of selected) {
    const exported = manifest.find(
      (m) =>
        m.id === a.id &&
        m.group === a.group &&
        m.source === a.source &&
        m.assetType === a.assetType &&
        m.pathId === a.pathId &&
        m.container === a.container,
    );
    assert.ok(exported, `Unexported selected asset ${a.id}`);
    assert.equal(records.get(a.id)?.image, exported.file, `Wrong image association ${a.id}`);
    const native = nativeImages.find(
      (entry) =>
        entry.source === a.source &&
        entry.assetType === a.assetType &&
        entry.pathId === a.pathId &&
        entry.container === a.container,
    );
    assert.ok(native, "Original image association");
    assert.deepEqual(
      exported.original,
      { file: native.file, sha256: native.sha256, width: native.width, height: native.height },
      "Original image evidence",
    );
    const originalBytes = fs.readFileSync(native.file);
    const png = PNG.sync.read(originalBytes, { checkCRC: true });
    assert.equal(
      crypto.createHash("sha256").update(originalBytes).digest("hex"),
      native.sha256,
      "Original PNG hash",
    );
    assert.equal(png.width, native.width, "Original width");
    assert.equal(png.height, native.height, "Original height");
    assert.equal(png.data.length, png.width * png.height * 4, "Complete original PNG");
  }
  const sources = readJson<SourceAudit>(path.join(options.work, "source-audit.json"));
  assert.equal(sources.passed, true, "Source audit");
  assert.ok(
    sources.records.every((r) => r.matchesManifest),
    "Individual source checks",
  );
  assert.equal(sources.configChecks.length, 2, "Two configuration files");
  for (const checked of [
    ...sources.records,
    ...sources.configChecks.map((r) => ({ ...r, source: r.file })),
  ]) {
    const hash = crypto.createHash("md5");
    for await (const bytes of fs.createReadStream(checked.source)) hash.update(bytes);
    assert.equal(hash.digest("hex"), checked.md5, `Changed source after audit: ${checked.source}`);
    assert.equal(fs.statSync(checked.source).size, checked.size, "Source size after audit");
  }
  assert.equal(
    new Set(manifest.map((a) => a.id)).size,
    selected.length,
    "Unique processed records",
  );
  assert.equal(manifest.length, selected.length, "Exact selected/processed resource set");
  const used = new Set(all.map((r) => r.image).filter((image): image is string => Boolean(image)));
  assert.deepEqual(
    new Set(fs.readdirSync(path.join(staging, "assets")).map((s) => `assets/${s}`)),
    used,
    "No missing/unreferenced assets",
  );
  for (const image of used) {
    const bytes = fs.readFileSync(path.join(staging, image)),
      decoded = await decodeWebp(bytes);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.equal(image, `assets/${sha256}.webp`, "Image content hash");
    for (const entry of manifest.filter((a) => a.file === image)) {
      const target = imageDimensions(entry.group);
      assert.equal(decoded.width, target.width, "Target image width");
      assert.equal(decoded.height, target.height, "Target image height");
      assert.equal(decoded.width, entry.width, "Manifest image width");
      assert.equal(decoded.height, entry.height, "Manifest image height");
      assert.equal(sha256, entry.sha256, "Manifest image hash");
    }
  }
  const proofs = readJson<EvidenceRecord[]>(path.join(options.work, "field-evidence.json"));
  const missing = readJson<EvidenceRecord[]>(path.join(options.work, "missing-fields.json"));
  const proofValues = new Map(proofs.map((p) => [`${p.id}.${p.field}`, p.value]));
  const missingKeys = new Set(missing.filter((p) => p.reason).map((p) => `${p.id}.${p.field}`));
  const coverage: Record<string, unknown> = {};
  for (const group of contentGroups) {
    const fields = additionalFields[group];
    const rows = groupAt(content, group);
    coverage[group] = Object.fromEntries(
      [...basicFields, ...fields].map((field) => {
        for (const row of rows) {
          if (field === "id") continue;
          assert.ok(
            (fieldValue(row, field) === null ? missingKeys : proofValues).has(`${row.id}.${field}`),
            `Missing evidence/reason ${row.id}.${field}`,
          );
          if (fieldValue(row, field) !== null)
            assert.deepEqual(
              fieldValue(row, field),
              proofValues.get(`${row.id}.${field}`),
              `Evidence value mismatch ${row.id}.${field}`,
            );
        }
        return [
          field,
          {
            populated: rows.filter((r) => fieldValue(r, field) !== null).length,
            null: rows.filter((r) => fieldValue(r, field) === null).length,
          },
        ];
      }),
    );
  }
  writeJson(path.join(options.work, "coverage.json"), coverage);
  writeJson(path.join(options.work, "validation.json"), {
    passed: true,
    gameVersion: profile.gameVersion,
    revision: profile.dataRevision,
    records: all.length,
    counts,
    images: used.size,
    recordsWithImages: all.filter((r) => r.image).length,
    checkedPackages: sources.checkedPackages,
    contentSha256: crypto.createHash("sha256").update(fs.readFileSync(contentFile)).digest("hex"),
  });
  console.log(`Validated ${all.length} records, ${used.size} complete WebPs`);
}
