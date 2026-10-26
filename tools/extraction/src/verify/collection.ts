import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseCatalogV4, projectLegacyCatalog } from "@loomix/content-schema/v4";
import type { CatalogV4 } from "@loomix/content-schema/v4";
import { readJson, writeJson } from "../workflow/json.ts";
import { RawCollectionSchema } from "../extraction/collection/build.ts";
import { collectionEvidenceSchema } from "../extraction/collection/evidence.ts";
import type { CollectionEvidence } from "../extraction/collection/evidence.ts";
import { parseRawContent } from "../extraction/schemas/raw-content.ts";
import { Tables } from "../extraction/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";
import { verifyCollectionFields } from "./collection-fields.ts";
import { verifySeedImages } from "./collection-images.ts";

function verifyProofSources(proof: CollectionEvidence, tables: Tables): void {
  const rows: { row: TableRow; fields: number[] }[] = [];
  const add = (root: number, predicate: (row: TableRow) => boolean, fields: number[]) => {
    for (const row of tables.rows(root).filter(predicate)) rows.push({ row, fields });
  };
  if (proof.owner === "seed") {
    if (proof.field === "name") add(318, (row) => tables.id(row) === proof.id, [0, 1]);
    else add(144, (row) => tables.id(row) === proof.id, [0, 10]);
  } else if (proof.field === "attributes.sources") {
    add(325, (row) => tables.id(row) === proof.id, [0, 2]);
    const codes = new Set(rows.flatMap(({ row }) => tables.vector(row, 2) ?? []));
    add(618, (row) => codes.has(tables.id(row)), [1]);
  } else if (proof.field === "attributes.scientificName") {
    add(93, (row) => tables.id(row) === proof.id, [16]);
  } else if (proof.field === "research") {
    add(93, (row) => tables.id(row) === proof.id, [7, 8, 9, 13, 14, 15]);
  } else if (proof.field === "seedId") {
    add(144, (row) => tables.vector(row, 10)?.includes(proof.id) ?? false, [0, 10]);
  } else if (proof.field === "craftingRecipes") {
    add(568, (row) => tables.uint(row, 1) === proof.id, [0, 1, 12, 13, 14, 15, 16, 17, 18, 19]);
  } else {
    add(122, (row) => tables.uint(row, 4) === proof.id, [0, 2, 4, 15]);
    if (proof.field === "difficultyRequirement") {
      const ids = new Set(rows.map(({ row }) => tables.uint(row, 2)));
      add(121, (row) => ids.has(tables.id(row)), [0, 2]);
    }
  }
  for (const source of proof.sources) {
    if (source.table === 1) {
      const entry = tables.textmap[source.row];
      assert.ok(entry && entry.rowOffset === source.rowOffset);
      assert.deepEqual(source.fields, [1]);
      assert.ok(
        rows.some(({ row, fields }) =>
          fields.some((field) => tables.uint(row, field) === source.row),
        ),
        "Bound localized source hash",
      );
    } else {
      const match = rows.find(
        ({ row }) =>
          row.root === source.table &&
          row.rowOffset === source.rowOffset &&
          tables.id(row) === source.row,
      );
      assert.ok(match, `Unrelated collection source ${proof.id}.${proof.field}`);
      assert.deepEqual(source.fields, match.fields, "Exact collection source fields");
    }
  }
  if (proof.value !== null)
    for (const { row, fields } of new Map(
      rows.map((entry) => [`${entry.row.root}:${tables.id(entry.row)}`, entry]),
    ).values())
      assert.ok(
        proof.sources.some(
          (source) =>
            source.table === row.root &&
            source.row === tables.id(row) &&
            fields.every((field) => source.fields.includes(field)),
        ),
        "Complete joined source rows",
      );
}

export async function verifyCollection(
  bundle: string,
  reportRoot: string,
  raw: boolean,
  writeReports = true,
): Promise<CatalogV4> {
  const file = raw
    ? path.join(bundle, "raw/images-content-v4.json")
    : path.join(reportRoot, "staging/content.json");
  const catalog = raw ? RawCollectionSchema.parse(readJson(file)) : parseCatalogV4(readJson(file));
  const base = parseRawContent(readJson(path.join(bundle, "raw/images-content.json")));
  const withoutImages = (items: typeof base.items) =>
    items.map(({ image: _image, ...record }) => record);
  const legacy = projectLegacyCatalog(catalog);
  if (raw) assert.deepEqual(legacy, base, "Raw v4 image/base projection");
  assert.deepEqual(
    withoutImages(legacy.items),
    withoutImages(base.items),
    "V4 preserves extracted base fields",
  );
  assert.deepEqual(legacy.source, base.source);
  assert.deepEqual(legacy.ingredientCategories, base.ingredientCategories);
  const tables = new Tables(path.join(bundle, "prepared"));
  const { requiredFields, craftingAudit } = verifyCollectionFields(catalog, tables);
  assert.deepEqual(
    readJson(path.join(bundle, "crafting-audit.json")),
    craftingAudit,
    "Independent crafting audit including exclusions",
  );
  const proofs = readJson<CollectionEvidence[]>(path.join(bundle, "collection-evidence.json"));
  if (!raw)
    assert.deepEqual(
      fs.readFileSync(path.join(reportRoot, "collection-evidence.json")),
      fs.readFileSync(path.join(bundle, "collection-evidence.json")),
    );
  assert.deepEqual(readJson(path.join(bundle, "evidence/collection-evidence.json")), proofs);
  assert.deepEqual(readJson(path.join(bundle, "evidence/crafting-audit.json")), craftingAudit);
  const seen = new Set<string>();
  const coverage: Record<string, { populated: number; null: number }> = {};
  for (const input of proofs) {
    const proof = collectionEvidenceSchema.parse(input);
    const key = `${proof.owner}:${proof.id}:${proof.field}`;
    assert.ok(
      requiredFields.has(key) && !seen.has(key),
      `Unexpected/duplicate collection evidence ${key}`,
    );
    assert.deepEqual(proof.value, requiredFields.get(key), `Collection evidence value ${key}`);
    verifyProofSources(proof, tables);
    seen.add(key);
    const category =
      proof.owner === "seed"
        ? "seed"
        : catalog.items.find((item) => item.id === proof.id)!.category;
    const stats = (coverage[`${category}.${proof.field}`] ??= { populated: 0, null: 0 });
    stats[proof.value === null ? "null" : "populated"]++;
  }
  assert.equal(seen.size, requiredFields.size, "Complete collection evidence coverage");
  await verifySeedImages(catalog, bundle, reportRoot, raw);
  if (writeReports) writeJson(path.join(reportRoot, "collection-coverage.json"), coverage);
  return catalog;
}
