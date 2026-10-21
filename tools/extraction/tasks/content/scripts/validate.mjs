import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { profile } from "./config.mjs";
import { Tables } from "./table-reader.mjs";
import { readJson, writeJson } from "./io.mjs";
import { additionalFields, basicFields, groupAt, validateModel } from "./model.mjs";

export async function validate(options) {
  const staging = path.join(options.work, "staging"),
    contentFile = path.join(staging, "content.json");
  const content = readJson(contentFile),
    tables = new Tables(path.join(options.work, "prepared"));
  const scope = tables.rows(profile.roots.content).map((r) => tables.uint(r, 0));
  assert.deepEqual(
    scope.slice().sort((a, b) => a - b),
    readJson(path.join(options.work, "scope.json")),
    "Fresh root 93 ID set",
  );
  const qualities = new Set(tables.rows(profile.roots.qualities).map((r) => tables.uint(r, 1, 0)));
  const { all, counts } = validateModel(content, scope, profile.expectedContent, qualities);
  const manifest = readJson(path.join(options.work, "image-manifest.json"));
  const selected = readJson(path.join(options.work, "selected-images.json"));
  const records = new Map(all.map((r) => [r.id, r]));
  for (const a of selected) {
    const exported = manifest.find(
      (m) =>
        m.source === a.source &&
        m.assetType === a.assetType &&
        m.pathId === a.pathId &&
        m.container === a.container,
    );
    assert.ok(exported, `Unexported selected asset ${a.id}`);
    assert.equal(records.get(a.id).image, exported.file, `Wrong image association ${a.id}`);
  }
  const sources = readJson(path.join(options.work, "source-audit.json"));
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
  const selectedKeys = new Set(selected.map((a) => `${a.source}|${a.assetType}|${a.pathId}`));
  assert.equal(manifest.length, selectedKeys.size, "Exact selected/exported resource set");
  const used = new Set(all.map((r) => r.image).filter(Boolean));
  assert.deepEqual(
    new Set(fs.readdirSync(path.join(staging, "assets")).map((s) => `assets/${s}`)),
    used,
    "No missing/unreferenced assets",
  );
  for (const image of used) {
    const bytes = fs.readFileSync(path.join(staging, image)),
      png = PNG.sync.read(bytes, { checkCRC: true });
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.equal(image, `assets/${sha256}.png`, "Image content hash");
    assert.equal(png.data.length, png.width * png.height * 4, "Full PNG decoding");
  }
  const proofs = readJson(path.join(options.work, "field-evidence.json"));
  const missing = readJson(path.join(options.work, "missing-fields.json"));
  const proofValues = new Map(proofs.map((p) => [`${p.id}.${p.field}`, p.value]));
  const missingKeys = new Set(missing.filter((p) => p.reason).map((p) => `${p.id}.${p.field}`));
  const coverage = {};
  for (const [group, fields] of Object.entries(additionalFields)) {
    const rows = groupAt(content, group);
    coverage[group] = Object.fromEntries(
      [...basicFields, ...fields].map((field) => {
        for (const row of rows) {
          if (field === "id") continue;
          assert.ok(
            (row[field] === null ? missingKeys : proofValues).has(`${row.id}.${field}`),
            `Missing evidence/reason ${row.id}.${field}`,
          );
          if (row[field] !== null)
            assert.deepEqual(
              row[field],
              proofValues.get(`${row.id}.${field}`),
              `Evidence value mismatch ${row.id}.${field}`,
            );
        }
        return [
          field,
          {
            populated: rows.filter((r) => r[field] !== null).length,
            null: rows.filter((r) => r[field] === null).length,
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
  console.log(`Validated ${all.length} records, ${used.size} complete PNGs`);
}
