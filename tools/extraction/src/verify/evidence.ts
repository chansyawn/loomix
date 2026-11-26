import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import type {
  EvidenceSource,
  FieldEvidence,
  FieldEvidenceReport,
} from "../extraction/evidence/domain-schema.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { digest } from "../workflow/hashing.ts";
import { within } from "../paths.ts";
import { readJson } from "../workflow/json.ts";
import { evidenceEntity, evidenceField } from "../extraction/assemble/validate-evidence.ts";

export function verifyFieldSources(
  fields: readonly FieldEvidence[],
  collection: string,
  id: number,
  fieldPath: string,
  sources: EvidenceSource[],
  status: FieldEvidence["status"] = "confirmed",
  reasonCode: FieldEvidence["reasonCode"] = null,
): void {
  const proof = fields.find(
    (entry) =>
      entry.entity.collection === collection &&
      entry.entity.id === id &&
      entry.fieldPath === fieldPath,
  );
  const label = `${collection}:${id}.${fieldPath}`;
  assert.ok(proof, `Missing independent field evidence ${label}`);
  assert.equal(proof.status, status, `Independent field evidence status ${label}`);
  assert.equal(proof.reasonCode, reasonCode, `Independent field evidence reason ${label}`);
  const normalize = (source: EvidenceSource) => {
    const { file, ...rest } = source;
    return JSON.stringify(
      Object.entries({
        ...rest,
        file: source.kind === "asset" ? file : file.replace(/^source\//, ""),
      }).sort(([left], [right]) => left.localeCompare(right, "en")),
    );
  };
  assert.deepEqual(
    [...new Set(proof.sources.map(normalize))].sort(),
    [...new Set(sources.map(normalize))].sort(),
    `Independent field evidence sources ${label}`,
  );
}

export function verifyEvidence(
  directory: string,
  dataset: Dataset,
  evidence: FieldEvidenceReport,
  tables: Tables,
): void {
  const assets = readJson<{ Source: string; PathID: string }[]>(
    path.join(directory, "source/prepared/asset-index.json"),
  );
  const assetLocators = new Set(assets.map((asset) => `${asset.Source}:${asset.PathID}`));
  const textRows = new Set(Object.values(tables.textmap).map((entry) => entry.rowOffset));
  const rowOffsets = new Map<number, Set<number>>();
  const jsonFiles = new Map<string, { sha256: string; value: unknown }>();
  const covered = new Set<string>();
  for (const proof of evidence.fields) {
    const entity = evidenceEntity(dataset, proof.entity.collection, proof.entity.id);
    assert.ok(entity, "Evidence entity exists");
    const field = evidenceField(entity, proof.fieldPath);
    assert.ok(field.found, "Evidence field exists");
    if (proof.status === "confirmed")
      assert.notEqual(field.value, null, `Confirmed null ${proof.entity.id}.${proof.fieldPath}`);
    covered.add(`${proof.entity.collection}:${proof.entity.id}:${proof.fieldPath}`);
    for (const source of proof.sources) {
      if (source.kind === "asset") {
        assert.ok(
          assetLocators.has(`${source.file}:${source.pathId}`),
          "Exact evidence asset locator",
        );
      } else if (source.kind === "manual" || source.kind === "assetJson") {
        if (source.kind === "assetJson")
          assert.ok(
            assetLocators.has(`${source.source}:${source.pathId}`),
            "Exact JSON asset locator",
          );
        let file = jsonFiles.get(source.file);
        if (!file) {
          const bytes = fs.readFileSync(within(directory, source.file));
          file = { sha256: digest(bytes), value: JSON.parse(bytes.toString()) };
          jsonFiles.set(source.file, file);
        }
        assert.equal(file.sha256, source.sha256, "Frozen JSON provenance bytes");
        let value = file.value;
        for (const key of source.pointer.split("/").slice(1)) {
          assert.ok(value && typeof value === "object" && key in value);
          value = Reflect.get(value, key);
        }
      } else {
        assert.equal(source.file, "source/prepared/ed.obb");
        if (source.table === 1) {
          assert.ok(
            source.kind === "table" && textRows.has(source.rowOffset),
            "Exact localized evidence row",
          );
          continue;
        }
        let offsets = rowOffsets.get(source.table);
        if (!offsets) {
          offsets = new Set(tables.rows(source.table).map((row) => row.rowOffset));
          rowOffsets.set(source.table, offsets);
        }
        if (source.kind === "table")
          assert.ok(offsets.has(source.rowOffset), "Exact evidence table row");
      }
    }
  }
  for (const item of dataset.catalog.items) {
    for (const field of Object.keys(item)) {
      if (field === "id" || field === "growth") continue;
      const fieldPath = field === "front" ? "front.background" : field;
      assert.ok(
        covered.has(`catalog.items:${item.id}:${fieldPath}`),
        `Required field provenance ${item.id}.${field}`,
      );
    }
    if (item.kind === "seed") {
      for (const field of Object.keys(item.growth)) {
        if (field === "kind" || field === "stages") continue;
        assert.ok(
          covered.has(`catalog.items:${item.id}:growth.${field}`),
          `Growth provenance ${item.id}.${field}`,
        );
      }
      for (const [index, stage] of item.growth.stages.entries())
        for (const field of Object.keys(stage))
          assert.ok(
            covered.has(`catalog.items:${item.id}:growth.stages.${index}.${field}`),
            `Stage provenance ${item.id}:${stage.id}.${field}`,
          );
    }
  }
  for (const entry of dataset.catalog.collections)
    for (const field of Object.keys(entry)) {
      if (field === "id") continue;
      assert.ok(
        covered.has(`catalog.collections:${entry.id}:${field}`),
        `Required collection provenance ${entry.id}.${field}`,
      );
    }
  for (const entry of dataset.catalog.inspoBoxes)
    for (const field of ["name", "acquisitionHint", "image"])
      assert.ok(
        covered.has(`catalog.inspoBoxes:${entry.id}:${field}`),
        `Required creation card set provenance ${entry.id}.${field}`,
      );
  for (const collection of ["regions", "islets", "iconStyles"] as const)
    for (const entry of dataset.starsea[collection])
      for (const field of Object.keys(entry)) {
        if (field === "id") continue;
        assert.ok(
          covered.has(`starsea.${collection}:${entry.id}:${field}`),
          `Required starsea provenance ${collection}:${entry.id}.${field}`,
        );
      }
  for (const collection of ["templates", "fallbackItems"] as const)
    for (const entry of dataset.vignettes[collection])
      for (const field of Object.keys(entry)) {
        if (field === "id") continue;
        assert.ok(
          covered.has(`vignettes.${collection}:${entry.id}:${field}`),
          `Required vignette provenance ${collection}:${entry.id}:${field}`,
        );
      }
  for (const [collection, entries] of Object.entries(dataset.hairDyeing))
    for (const entry of entries as Array<{ id: number } | { itemId: number }>) {
      const id = "id" in entry ? entry.id : entry.itemId;
      const fields =
        collection === "flowerRules"
          ? ["$"]
          : Object.keys(entry).filter((field) => field !== "id" && field !== "itemId");
      for (const field of fields)
        assert.ok(
          covered.has(`hairDyeing.${collection}:${id}:${field}`),
          `Required dyeing provenance ${collection}:${id}:${field}`,
        );
    }
}
