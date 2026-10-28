import fs from "node:fs";
import path from "node:path";
import { emptyCatalog, recordSchemas } from "@loomix/schema/extraction";
import type { WorkOptions, EvidenceRecord, SelectedImage, BinDataAsset } from "../types.ts";
import { catalogSource, expectedCatalog } from "../../profile.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { removeWithin } from "../../workflow/fs.ts";
import { validateModel } from "./model.ts";
import { fieldCandidateSchema } from "../evidence/schema.ts";
import type { FieldCandidate } from "../evidence/schema.ts";
import { createContentContext } from "./context.ts";
import { buildRecord } from "./records/index.ts";
import type { RecordContext } from "./records/types.ts";
import { buildCookingAudit } from "./recipes.ts";
import { profile } from "../../profile.ts";

export async function structure(options: WorkOptions): Promise<void> {
  const context = createContentContext(options.work);
  const content = emptyCatalog(catalogSource);
  content.ingredientCategories = context.ingredientCategoryBuild.categories;
  const proofs: EvidenceRecord[] = [];
  const diagnostics: EvidenceRecord[] = [];
  const candidateImages: SelectedImage[] = [];
  const candidateFields: FieldCandidate[] = [];

  for (const id of [...context.scope.ids].sort((a, b) => a - b)) {
    const row = context.scope.encyclopedia.get(id);
    const group = context.scope.groups.get(id);
    const main = context.main.get(id);
    if (!group || !main) throw new Error(`Missing classification for ${id}`);
    const record: RecordContext = {
      id,
      group,
      row,
      main,
      ui: context.ui.get(id),
      creature: context.creatures.get(id),
      crop: context.vocabulary.cropsByProduct.get(id),
      recipe: context.recipesByProduct.get(id),
    };
    const builder = buildRecord(context, record);
    content.items.push(recordSchemas[group].parse(builder.record));
    proofs.push(...builder.proofs);
    diagnostics.push(...builder.diagnostics);
    candidateFields.push(...builder.candidates);
    candidateImages.push(...builder.images);
  }

  content.items.sort((a, b) => a.id - b.id);
  validateModel(
    content,
    context.scope.ids,
    expectedCatalog,
    new Set(context.vocabulary.qualityLabels.keys()),
  );

  const staging = path.join(options.work, "raw");
  removeWithin(staging, options.work);
  fs.mkdirSync(path.join(staging, "assets"), { recursive: true });
  writeJson(path.join(staging, "content.json"), content);
  writeJson(path.join(options.work, "record-evidence.json"), context.scope.admissionEvidence);
  writeJson(
    path.join(options.work, "scope.json"),
    [...context.scope.ids].sort((a, b) => a - b),
  );
  writeJson(
    path.join(options.work, "quality-enum.json"),
    Object.fromEntries(context.vocabulary.qualityLabels),
  );
  writeJson(path.join(options.work, "candidate-images.json"), candidateImages);
  writeJson(path.join(options.work, "field-evidence.json"), proofs);
  writeJson(path.join(options.work, "missing-fields.json"), diagnostics);
  writeJson(path.join(options.work, "outside-members.json"), context.scope.outsideMembers);
  writeJson(
    path.join(options.work, "field-candidates.json"),
    candidateFields.map((candidate) => fieldCandidateSchema.parse(candidate)),
  );
  writeJson(path.join(options.work, "field-investigation.json"), {
    scope: "Root 93 entries union version-bound confirmed supplemental admissions",
    verified: [
      "root 93 membership",
      "33 filters + 318 tags + GameplayTag ancestry",
      "325.15 → 83.1 quality enum (0–4)",
      "325.2 vector → 618.0 source keys",
      "325.35 / 262.9 / 519.9 series backreferences",
      "325.30–34 ecological display keys",
      "144.10 crop product vector → 144.5 harvest count",
      "122.4 dish product → 122.2 difficulty / 122.16 cookware",
    ],
    unresolved: [
      {
        field: "sizeRange",
        candidates: "132.4/5 integers, 132.3/6 float parameters; root93.8 size task text",
        reason:
          "Integer endpoints correlate with task thresholds, but exact displayed unit conversion has no independent schema/UI evidence",
      },
      {
        field: "maturityPeriod",
        candidates: "144.3 daily cycle enum, 144.4 grow-stage IDs; flower/tree configurations",
        reason:
          "Stage count alone does not prove elapsed days or first-harvest time; flower/tree growth rules have not been recovered",
      },
      {
        field: "image",
        groups: "creatures.series / plants.series / dishes.series",
        reason:
          "67 theme display configurations reuse furniture images; dedicated image purpose unconfirmed",
      },
    ],
  });
  const bindata = readJson<BinDataAsset[]>(path.join(options.work, "bindata-manifest.json"));
  const bindataFile = (name: string) =>
    bindata.find((asset) => asset.Name === name)?.file ?? `bindata/${name}.json`;
  const cookingAudit = buildCookingAudit({
    tables: context.tables,
    recipeRows: context.recipeRows,
    scope: context.scope,
    categoryBuild: context.ingredientCategoryBuild,
    bindataFiles: {
      tags: bindataFile(profile.binData.tags),
      tagDisplay: bindataFile(profile.binData.tagDisplay),
    },
  });
  if (
    cookingAudit.counts.dishRecipes !== 121 ||
    cookingAudit.counts.dishRecipesWithExpressions !== 112 ||
    cookingAudit.counts.dishRecipesWithoutExpressions !== 9 ||
    cookingAudit.counts.plantProductCandidates !== 40 ||
    cookingAudit.counts.outsideScopeProducts !== 10
  )
    throw new Error(`Cooking scope changed: ${JSON.stringify(cookingAudit.counts)}`);
  writeJson(path.join(options.work, "cooking-audit.json"), cookingAudit);
  writeJson(path.join(options.work, "cooking-evidence.json"), {
    schemaVersion: 1,
    source: cookingAudit.source,
    counts: cookingAudit.counts,
    recipes: cookingAudit.records.filter((record) => record.disposition === "recipe"),
    outsideProducts: cookingAudit.outsideDishProducts,
  });
  writeJson(path.join(options.work, "cooking-investigation.json"), {
    schemaVersion: 1,
    source: cookingAudit.source,
    counts: cookingAudit.counts,
    reason:
      "Recipe quantity and runtime slot semantics are not confirmed; configuration expressions are retained with parser results",
    recipes: cookingAudit.records,
    categories: cookingAudit.categories,
    unlistedIngredientReferences: cookingAudit.categories.filter(
      (category) => category.unlistedItemIds.length > 0,
    ),
    plantProductCandidates: cookingAudit.plantProductCandidates,
    outsideProducts: cookingAudit.outsideDishProducts,
  });
  console.log(
    `Structured ${context.scope.ids.size} records; found ${candidateImages.length} candidate image references`,
  );
}
