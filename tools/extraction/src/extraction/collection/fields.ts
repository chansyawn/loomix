import { TastesSchema } from "../schema.ts";
import type { ContentContext } from "../content/context.ts";
import { plainText } from "../content/model.ts";
import type { CollectionEvidenceBuilder } from "./evidence.ts";
import { localizedSources, tableSource } from "./evidence.ts";
import { parseDifficultyRequirement } from "./conditions.ts";

export function readCreatureFields(
  context: ContentContext,
  id: number,
  proofs: CollectionEvidenceBuilder,
) {
  const { tables } = context;
  const row = context.scope.encyclopedia.get(id);
  const scientificName = plainText(tables.text(row, 16));
  proofs.put(
    "item",
    id,
    "attributes.scientificName",
    scientificName,
    localizedSources(tables, row, [16]),
    "93.0=item ID",
    "93.16 TextMap → scientific name; strip markup",
    "scientific_name_not_configured_or_text_missing",
  );
  return { scientificName };
}

export function readDishFields(
  context: ContentContext,
  id: number,
  proofs: CollectionEvidenceBuilder,
) {
  const { tables } = context;
  const recipe = context.recipesByProduct.get(id);
  const rawTaste = tables.string(recipe, 15);
  const tastes = rawTaste ? TastesSchema.parse([...new Set(rawTaste.split("|"))]) : null;
  const recipeSources = recipe ? [tableSource(tables, recipe, [0, 2, 4, 15])] : [];
  proofs.put(
    "item",
    id,
    "attributes.tastes",
    tastes,
    recipeSources,
    "122.4=dish ID",
    "Split 122.15 on |; preserve explicit 甜/咸 labels",
    "taste_not_configured",
  );
  const difficulty = context.vocabulary.difficulties.get(tables.uint(recipe, 2));
  const rawExpression = tables.string(difficulty, 2);
  const difficultyRequirement = rawExpression ? parseDifficultyRequirement(rawExpression) : null;
  if (difficultyRequirement?.condition === null)
    throw new Error(
      `Unsupported difficulty condition ${id}: ${difficultyRequirement.unresolvedReason}`,
    );
  proofs.put(
    "item",
    id,
    "difficultyRequirement",
    difficultyRequirement,
    [...recipeSources, ...(difficulty ? [tableSource(tables, difficulty, [0, 2])] : [])],
    "122.4=dish ID; 122.2=121.0 difficulty ID",
    "Retain raw JSON; parse exactly one supported condition; not an exhaustive recipe unlock rule",
    "difficulty_condition_not_configured",
  );
  return { tastes, difficultyRequirement };
}
