import assert from "node:assert/strict";
import path from "node:path";
import { baseCollectionObservations } from "../extraction/schema.ts";
import type { CollectionObservations } from "../extraction/schema.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { RawCollectionObservationsSchema } from "../extraction/collection/build.ts";
import { collectionEvidenceSchema } from "../extraction/collection/evidence.ts";
import type { CollectionEvidence } from "../extraction/collection/evidence.ts";
import { detailInvestigationSchema } from "../extraction/collection/details/investigation.ts";
import { parseRawContent } from "../extraction/schemas/raw-content.ts";
import { Tables } from "../extraction/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";
import { verifyCollectionFields } from "./collection-fields.ts";
import { verifySeedImages, verifyStageImages } from "./collection-images.ts";

function verifyProofSources(proof: CollectionEvidence, tables: Tables): void {
  const rows: { row: TableRow; fields: number[] }[] = [];
  const add = (root: number, predicate: (row: TableRow) => boolean, fields: number[]) => {
    for (const row of tables.rows(root).filter(predicate)) rows.push({ row, fields });
  };
  if (proof.owner === "seed") {
    if (proof.field === "name") add(318, (row) => tables.id(row) === proof.id, [0, 1]);
    else if (proof.field === "detail.description" || proof.field === "detail.quality")
      add(325, (row) => tables.id(row) === proof.id, [0, 15, 27]);
    else if (proof.field.startsWith("detail.trade"))
      add(
        659,
        (row) => tables.uint(row, 2) === proof.id,
        [0, 1, 2, 9, 10, 12, 13, 17, 18, 22, 23, 24],
      );
    else if (proof.field.startsWith("detail.acquisitionConditions")) {
      add(325, (row) => tables.id(row) === proof.id, [0, 2]);
      const codes = new Set(rows.flatMap(({ row }) => tables.vector(row, 2) ?? []));
      add(618, (row) => codes.has(tables.id(row)), [0, 1]);
    } else if (proof.field.startsWith("detail.growth")) {
      add(144, (row) => tables.id(row) === proof.id, [0, 3, 4, 5, 6, 8, 9, 10]);
      const stageIds = new Set(rows.flatMap(({ row }) => tables.vector(row, 8) ?? []));
      add(137, (row) => stageIds.has(tables.id(row)), [0, 1, 2, 3]);
    } else if (proof.field.startsWith("detail.stageIds"))
      add(144, (row) => tables.id(row) === proof.id, [0, 4]);
    else if (proof.field.startsWith("detail.harvestCount"))
      add(144, (row) => tables.id(row) === proof.id, [0, 5]);
    else if (proof.field.startsWith("detail.maturityDays"))
      add(144, (row) => tables.id(row) === proof.id, [0, 3, 4]);
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
  } else if (proof.field.startsWith("detail.")) {
    if (proof.field === "detail.flowerColors") {
      add(318, (row) => tables.id(row) === proof.id, [0, 9]);
    } else if (proof.field.startsWith("detail.growth")) {
      add(
        144,
        (row) => tables.vector(row, 10)?.includes(proof.id) ?? false,
        [0, 3, 4, 5, 6, 8, 9, 10],
      );
      const stageIds = new Set(rows.flatMap(({ row }) => tables.vector(row, 8) ?? []));
      add(137, (row) => stageIds.has(tables.id(row)), [0, 1, 2, 3]);
    } else if (proof.field.startsWith("detail.creatureSize")) {
      add(132, (row) => tables.id(row) === proof.id, [0, 3, 4, 5, 6]);
    } else if (proof.field.startsWith("detail.creatureGrades")) {
      add(325, (row) => tables.id(row) === proof.id, [0, 12, 14]);
    } else if (proof.field.startsWith("detail.hybridRecipes")) {
      add(
        241,
        (row) => [1, 2, 3].some((field) => tables.uint(row, field) === proof.id),
        [0, 1, 2, 3],
      );
      add(244, (row) => tables.vector(row, 2)?.includes(proof.id) ?? false, [0, 1, 2]);
    } else if (proof.field.startsWith("detail.dishEffects")) {
      add(122, (row) => tables.uint(row, 4) === proof.id, [0, 4, 6, 7, 8]);
      const effectIds = new Set(
        rows.flatMap(({ row }) => {
          const raw = tables.string(row, 6);
          return raw && /^\d+(?:[,;]\d+)*$/.test(raw) ? raw.split(/[,;]/).map(Number) : [];
        }),
      );
      add(70, (row) => effectIds.has(tables.id(row)), [0, 1, 4, 10, 19]);
    } else if (proof.field.startsWith("detail.acquisitionConditions")) {
      add(325, (row) => tables.id(row) === proof.id, [0, 2]);
      const codes = new Set(rows.flatMap(({ row }) => tables.vector(row, 2) ?? []));
      add(618, (row) => codes.has(tables.id(row)), [0, 1]);
    } else if (proof.field.startsWith("detail.trade")) {
      add(
        659,
        (row) => tables.uint(row, 2) === proof.id,
        [0, 1, 2, 9, 10, 12, 13, 17, 18, 22, 23, 24],
      );
    } else if (proof.field.startsWith("detail.treeDrops")) {
      const tree = tables.rows(708).find((row) => tables.id(row) === proof.id);
      if (tree) {
        rows.push({ row: tree, fields: [0, 1, 2, 3, 5] });
        const groupId = tables.uint(tree, 5);
        add(563, (row) => tables.uint(row, 0) === groupId, [0, 1, 2, 3, 4, 5, 15]);
      }
    }
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
  writeReports = true,
): Promise<CollectionObservations> {
  const file = path.join(bundle, "raw/images-catalog-observations.json");
  const catalog = RawCollectionObservationsSchema.parse(readJson(file));
  const base = parseRawContent(readJson(path.join(bundle, "raw/images-content.json")));
  const withoutImages = (items: typeof base.items) =>
    items.map(({ image: _image, ...record }) => record);
  const baseProjection = baseCollectionObservations(catalog);
  assert.deepEqual(baseProjection, base, "Raw observation base projection");
  assert.deepEqual(
    withoutImages(baseProjection.items),
    withoutImages(base.items),
    "Collection preserves extracted base fields",
  );
  assert.deepEqual(baseProjection.source, base.source);
  assert.deepEqual(baseProjection.ingredientCategories, base.ingredientCategories);
  const tables = new Tables(path.join(bundle, "prepared"));
  const { requiredFields, craftingAudit } = verifyCollectionFields(catalog, tables);
  assert.deepEqual(
    readJson(path.join(bundle, "crafting-audit.json")),
    craftingAudit,
    "Independent crafting audit including exclusions",
  );
  const proofs = readJson<CollectionEvidence[]>(path.join(bundle, "collection-evidence.json"));
  const missing = proofs.filter((proof) => proof.value === null);
  assert.deepEqual(
    readJson(path.join(bundle, "collection-missing-fields.json")),
    missing,
    "Every unknown detail has a reasoned missing-field record",
  );
  const investigation = detailInvestigationSchema.parse(
    readJson(path.join(bundle, "collection-investigation.json")),
  );
  assert.deepEqual(
    readJson(path.join(bundle, "evidence/collection-investigation.json")),
    investigation,
    "Client candidates are preserved in the evidence package",
  );
  for (const candidate of investigation.records)
    for (const source of candidate.sources) {
      if (source.table === 1) {
        assert.equal(tables.textmap[source.row]?.rowOffset, source.rowOffset);
        continue;
      }
      assert.ok(
        tables
          .rows(source.table)
          .some((row) => tables.id(row) === source.row && row.rowOffset === source.rowOffset),
        `Unrelated investigation source ${candidate.id}.${candidate.field}`,
      );
    }
  assert.deepEqual(readJson(path.join(bundle, "evidence/collection-evidence.json")), proofs);
  assert.deepEqual(readJson(path.join(bundle, "evidence/crafting-audit.json")), craftingAudit);
  const seen = new Set<string>();
  const coverage: Record<string, { populated: number; null: number }> = {};
  const withoutStageImages = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(withoutStageImages);
    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value))
        result[key] = key === "image" ? null : withoutStageImages(entry);
      return result;
    }
    return value;
  };
  for (const input of proofs) {
    const proof = collectionEvidenceSchema.parse(input);
    const key = `${proof.owner}:${proof.id}:${proof.field}`;
    assert.ok(
      requiredFields.has(key) && !seen.has(key),
      `Unexpected/duplicate collection evidence ${key}`,
    );
    assert.deepEqual(
      withoutStageImages(proof.value),
      withoutStageImages(requiredFields.get(key)),
      `Collection evidence value ${key}`,
    );
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
  await verifySeedImages(catalog, bundle);
  await verifyStageImages(catalog, bundle);
  if (writeReports) writeJson(path.join(reportRoot, "collection-coverage.json"), coverage);
  return catalog;
}
