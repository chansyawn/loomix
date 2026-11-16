import { cookingEvidence } from "./cooking-evidence.ts";
import { readCookingRecipes } from "./cooking.ts";
import { emptyCatalog, recordSchemas } from "../../schema.ts";
import type { EvidenceRecord, SelectedImage } from "../../types.ts";
import { catalogSource, expectedCatalog } from "../../../profile.ts";
import { validateModel } from "./model.ts";
import type { ContentContext } from "./context.ts";
import { buildRecord } from "./records/index.ts";
import type { RecordContext } from "./records/types.ts";
import { buildCookingAudit } from "./recipes.ts";

export function readContent(context: ContentContext) {
  const content = emptyCatalog(catalogSource);
  const cookingRecipes = readCookingRecipes(context);
  content.cookingRecipes = cookingRecipes;
  content.ingredientCategories = context.ingredientCategoryBuild.categories;
  const proofs: EvidenceRecord[] = [];
  const diagnostics: EvidenceRecord[] = [];
  const candidateImages: SelectedImage[] = [];

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
    candidateImages.push(...builder.images);
  }

  content.items.sort((a, b) => a.id - b.id);
  validateModel(
    content,
    context.scope.ids,
    expectedCatalog,
    new Set(context.vocabulary.qualityLabels.keys()),
  );

  const cookingAudit = buildCookingAudit({
    tables: context.tables,
    recipeRows: context.recipeRows,
    scope: context.scope,
    categoryBuild: context.ingredientCategoryBuild,
    tagSources: context.gameplayTags.sources,
  });
  if (
    cookingAudit.counts.dishRecipes !== 121 ||
    cookingAudit.counts.dishRecipesWithExpressions !== 112 ||
    cookingAudit.counts.dishRecipesWithoutExpressions !== 9 ||
    cookingAudit.counts.plantProductCandidates !== 40 ||
    cookingAudit.counts.outsideScopeProducts !== 10
  )
    throw new Error(`Cooking scope changed: ${JSON.stringify(cookingAudit.counts)}`);
  return {
    content,
    proofs: [...proofs, ...diagnostics],
    candidateImages,
    cookingEvidence: cookingEvidence(context, cookingRecipes),
    cookingAudit,
  };
}
