import type {
  ImageManifest,
  SelectedImage,
  SourceAudit,
  EvidenceRecord,
} from "../extraction/types.ts";
import type { Catalog } from "../extraction/schema.ts";
import { recordTypes, recordType, recordFields, recordField } from "../extraction/schema.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { fieldCandidateSchema, fieldEvidenceSchema } from "../extraction/evidence/schema.ts";

import { within } from "../paths.ts";
import { PNG } from "pngjs";
import { profile, expectedCatalog } from "../profile.ts";
import { Tables } from "../extraction/decode/tables.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { validateModel } from "../extraction/content/model.ts";
import { verifyAdmissions } from "./admissions.ts";
import { highestResolutionImages } from "../extraction/images/select.ts";
import { verifyNeighbors } from "../extraction/neighbors/verify.ts";
import { verifyNeighborImages } from "./neighbor-images.ts";
import { neighborInput } from "../extraction/neighbors/build.ts";
import { verifyIslandBundle } from "../extraction/islands/verify-bundle.ts";
import { verifyIslandImages } from "../extraction/islands/verify-images.ts";

export interface BundleVerification {
  reportRoot: string;
  bundle: string;
  staging: string;
  contentFile: string;
  parse: (input: unknown) => Catalog;
  writeReports: boolean;
  extraImages?: string[];
}

export async function verifyBundle(request: BundleVerification): Promise<void> {
  const { reportRoot, bundle, staging, contentFile, parse, writeReports } = request;
  const input = readJson(contentFile);
  const content = parse(input),
    tables = new Tables(path.join(bundle, "prepared"));
  const scope = verifyAdmissions(content, bundle);
  const qualities = new Set(tables.rows(profile.roots.qualities).map((r) => tables.uint(r, 1, 0)));
  const { all, counts } = validateModel(input, scope, expectedCatalog, qualities, parse);
  const neighbors = verifyNeighbors(
    readJson(path.join(staging, "neighbors.json")),
    neighborInput(bundle),
  );
  const islands = verifyIslandBundle(bundle, staging);
  const cookingAudit = readJson<{
    counts: Record<string, number>;
    categories: {
      id: number;
      tagName: string;
      name: string;
      parentId: number | null;
      itemIds: number[];
      unlistedItemIds: number[];
    }[];
    categoryAssociations: { categoryId: number; itemId: number; listed: boolean }[];
    records: {
      recipeId: number;
      productId: number;
      disposition: "recipe" | "plant_ingredient_candidate" | "outside_scope";
      fields: {
        ingredientSlots: {
          field: 20 | 25 | 30 | 35;
          rawExpression: string;
          expression: unknown;
          itemIds: number[] | null;
          parseReason: string | null;
        }[];
      };
      source: { table: number; row: number; rowOffset: number; fields: number[] };
    }[];
    outsideDishProducts: { productId: number; recipeId: number }[];
    plantProductCandidates: { productId: number; recipeId: number }[];
  }>(path.join(bundle, "evidence/cooking-audit.json"));
  assert.deepEqual(cookingAudit.counts, {
    table122Rows: 171,
    dishRecipes: 121,
    dishRecipesWithExpressions: 112,
    dishRecipesWithoutExpressions: 9,
    plantProductCandidates: 40,
    outsideScopeProducts: 10,
  });
  assert.equal(cookingAudit.records.length, cookingAudit.counts.table122Rows);
  assert.equal(new Set(cookingAudit.records.map((record) => record.recipeId)).size, 171);
  assert.equal(new Set(cookingAudit.records.map((record) => record.productId)).size, 171);
  assert.equal(
    cookingAudit.records.filter((record) => record.disposition === "recipe").length,
    cookingAudit.counts.dishRecipes,
  );
  assert.equal(
    cookingAudit.records.filter(
      (record) => record.disposition === "recipe" && record.fields.ingredientSlots.length > 0,
    ).length,
    cookingAudit.counts.dishRecipesWithExpressions,
  );
  assert.equal(
    cookingAudit.records.filter(
      (record) => record.disposition === "recipe" && record.fields.ingredientSlots.length === 0,
    ).length,
    cookingAudit.counts.dishRecipesWithoutExpressions,
  );
  assert.equal(
    cookingAudit.records.filter((record) => record.disposition === "plant_ingredient_candidate")
      .length,
    cookingAudit.counts.plantProductCandidates,
  );
  assert.equal(
    cookingAudit.records.filter((record) => record.disposition === "outside_scope").length,
    cookingAudit.counts.outsideScopeProducts,
  );
  assert.deepEqual(
    cookingAudit.outsideDishProducts.map(({ productId, recipeId }) => ({ productId, recipeId })),
    cookingAudit.records
      .filter((record) => record.disposition === "outside_scope")
      .map(({ productId, recipeId }) => ({ productId, recipeId })),
    "Outside-scope product audit",
  );
  assert.deepEqual(
    cookingAudit.plantProductCandidates.map(({ productId, recipeId }) => ({ productId, recipeId })),
    cookingAudit.records
      .filter((record) => record.disposition === "plant_ingredient_candidate")
      .map(({ productId, recipeId }) => ({ productId, recipeId })),
    "Plant product candidate audit",
  );
  assert.ok(
    cookingAudit.records.every(
      (record) =>
        record.source.table === profile.roots.recipes &&
        record.source.row === record.recipeId &&
        record.source.rowOffset > 0 &&
        record.source.fields.join(",") === "0,2,4,16,20,25,30,35",
    ),
    "Cooking audit table row provenance",
  );
  assert.deepEqual(
    cookingAudit.categories.map(({ id, tagName, name, parentId, itemIds }) => ({
      id,
      tagName,
      name,
      parentId,
      itemIds,
    })),
    content.ingredientCategories,
    "Ingredient category audit must match content index",
  );
  for (const category of cookingAudit.categories) {
    for (const listed of [true, false]) {
      const associated = cookingAudit.categoryAssociations
        .filter((entry) => entry.categoryId === category.id && entry.listed === listed)
        .map((entry) => entry.itemId)
        .sort((a, b) => a - b);
      const expected = listed ? category.itemIds : category.unlistedItemIds;
      assert.deepEqual(associated, expected, `Category item associations ${category.id}`);
    }
  }
  const contentItems = new Map(all.map((record) => [record.id, record]));
  for (const association of cookingAudit.categoryAssociations)
    assert.equal(
      association.listed,
      contentItems.get(association.itemId)?.kind === "item",
      `Category item admission ${association.categoryId}/${association.itemId}`,
    );
  assert.equal(
    new Set(cookingAudit.categoryAssociations.map((entry) => `${entry.categoryId}/${entry.itemId}`))
      .size,
    cookingAudit.categoryAssociations.length,
    "Unique category item associations",
  );
  for (const recipe of cookingAudit.records.filter((entry) => entry.disposition === "recipe")) {
    const dish = all.find((entry) => entry.id === recipe.productId);
    assert.ok(dish && dish.category === "dishes" && dish.kind === "item", "Dish recipe scope");
    assert.deepEqual(
      dish.recipe,
      {
        slots: recipe.fields.ingredientSlots.length
          ? recipe.fields.ingredientSlots.map((slot) => ({
              field: slot.field,
              rawExpression: slot.rawExpression,
              expression: slot.expression,
              itemIds: slot.itemIds,
              quantity: null,
            }))
          : null,
      },
      `Recipe output ${recipe.productId}`,
    );
  }
  const manifest = readJson<ImageManifest[]>(path.join(reportRoot, "image-manifest.json"));
  const selected = readJson<SelectedImage[]>(path.join(bundle, "selected-images.json"));
  assert.deepEqual(
    selected,
    highestResolutionImages(
      readJson<SelectedImage[]>(path.join(bundle, "candidate-images.json")),
      readJson<ImageManifest[]>(path.join(bundle, "image-candidates.json")),
    ),
    "Highest native resolution for every image",
  );
  const nativeImages = readJson<ImageManifest[]>(path.join(bundle, "image-candidates.json"));
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
  }
  for (const native of nativeImages) {
    const nativeFile = path.isAbsolute(native.file) ? native.file : path.join(bundle, native.file);
    const originalBytes = fs.readFileSync(within(bundle, path.relative(bundle, nativeFile)));
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
  const sources = readJson<SourceAudit>(path.join(bundle, "source-audit.json"));
  assert.equal(sources.passed, true, "Source audit");
  assert.ok(
    sources.records.every((r) => r.matchesManifest),
    "Individual source checks",
  );
  assert.equal(sources.configChecks.length, 2, "Two configuration files");
  assert.equal(
    new Set(manifest.map((a) => a.id)).size,
    selected.length,
    "Unique processed records",
  );
  assert.equal(manifest.length, selected.length, "Exact selected/processed resource set");
  const used = new Set(all.map((r) => r.image).filter((image): image is string => Boolean(image)));
  for (const image of request.extraImages ?? []) used.add(image);
  await verifyNeighborImages(neighbors, bundle);
  await verifyIslandImages(islands, bundle);
  for (const image of used)
    PNG.sync.read(fs.readFileSync(within(bundle, image)), { checkCRC: true });
  const proofs = readJson<EvidenceRecord[]>(path.join(reportRoot, "evidence/field-evidence.json"));
  const missing = readJson<EvidenceRecord[]>(path.join(bundle, "evidence/missing-fields.json"));
  const recordGroups = new Map(content.items.map((record) => [record.id, recordType(record)]));
  const evidenceKeys = new Set<string>();
  for (const proof of [...proofs, ...missing]) {
    fieldEvidenceSchema.parse(proof);
    assert.equal(recordGroups.get(proof.id), proof.group, "Evidence group must match content");
    assert.ok(recordFields(proof.group).includes(proof.field), "Evidence field whitelist");
    for (const source of proof.sources ?? []) {
      if (source.pointer) {
        assert.equal(source.file, "supplemental-admissions.json", "Manual evidence file");
        assert.equal(
          source.sha256,
          crypto
            .createHash("sha256")
            .update(fs.readFileSync(path.join(bundle, source.file)))
            .digest("hex"),
          "Frozen admission hash",
        );
        const admissions = readJson<{ entries: { id: number }[] }>(path.join(bundle, source.file));
        const match = /^\/entries\/(\d+)$/.exec(source.pointer);
        assert.ok(match, "Admission pointer");
        assert.equal(admissions.entries[Number(match[1])]?.id, proof.id, "Admission pointer ID");
      }
    }
    const key = `${proof.id}.${proof.field}`;
    assert.ok(!evidenceKeys.has(key), `Duplicate/conflicting field evidence: ${key}`);
    evidenceKeys.add(key);
  }
  const candidates = readJson<import("../extraction/evidence/schema.ts").FieldCandidate[]>(
    path.join(bundle, "evidence/field-candidates.json"),
  );
  for (const input of candidates) {
    const candidate = fieldCandidateSchema.parse(input);
    const row = content.items.find(
      (record) => record.id === candidate.id && recordType(record) === candidate.group,
    );
    assert.ok(row, "Candidate record must be in scope");
    assert.equal(
      recordField(row, candidate.field),
      null,
      "Unconfirmed candidates cannot populate output fields",
    );
  }
  const proofValues = new Map(proofs.map((p) => [`${p.id}.${p.field}`, p.value]));
  const missingKeys = new Set(missing.filter((p) => p.reason).map((p) => `${p.id}.${p.field}`));
  const coverage: Record<string, unknown> = {};
  for (const group of recordTypes) {
    const fields = recordFields(group);
    const rows = content.items.filter((record) => recordType(record) === group);
    coverage[group] = Object.fromEntries(
      fields.map((field) => {
        for (const row of rows) {
          assert.ok(
            (recordField(row, field) === null ? missingKeys : proofValues).has(
              `${row.id}.${field}`,
            ),
            `Missing evidence/reason ${row.id}.${field}`,
          );
          if (recordField(row, field) !== null)
            assert.deepEqual(
              recordField(row, field),
              proofValues.get(`${row.id}.${field}`),
              `Evidence value mismatch ${row.id}.${field}`,
            );
        }
        return [
          field,
          {
            populated: rows.filter((r) => recordField(r, field) !== null).length,
            null: rows.filter((r) => recordField(r, field) === null).length,
          },
        ];
      }),
    );
  }
  if (writeReports) writeJson(path.join(reportRoot, "coverage.json"), coverage);
  if (writeReports)
    writeJson(path.join(reportRoot, "validation.json"), {
      passed: true,
      gameVersion: profile.gameVersion,
      revision: profile.dataRevision,
      records: all.length,
      neighbors: neighbors.neighbors.length,
      counts,
      images: used.size,
      recordsWithImages: all.filter((r) => r.image).length,
      checkedPackages: sources.checkedPackages,
      contentSha256: crypto.createHash("sha256").update(fs.readFileSync(contentFile)).digest("hex"),
    });
  console.log(`Validated ${all.length} records, ${used.size} complete PNGs`);
}
