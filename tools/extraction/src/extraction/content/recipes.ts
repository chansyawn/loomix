import type { IngredientCategory, IngredientExpression, ItemId, RecipeSlot } from "../schema.ts";
import type { Row, TableRow } from "../types.ts";
import type { Tables } from "../decode/tables.ts";
import type { Vocabulary } from "./vocabulary.ts";
import type { Scope } from "./scope.ts";
import { profile } from "../../profile.ts";

export interface IngredientCategoryBuild {
  categories: IngredientCategory[];
  byTagName: Map<string, IngredientCategory>;
  unlistedReferences: { categoryId: number; tagName: string; itemIds: number[] }[];
  associations: {
    categoryId: number;
    itemId: number;
    listed: boolean;
    rowOffset: number;
  }[];
}

export interface ParsedIngredientExpression {
  expression: IngredientExpression | null;
  reason: string | null;
}

function fallbackCategoryName(tagName: string): string {
  return tagName.replace(/^食材_?/, "") || tagName;
}

export function buildIngredientCategories(
  tables: Pick<Tables, "rows" | "string" | "uint">,
  vocabulary: Pick<Vocabulary, "tagIndex" | "tags" | "translateTag">,
  scope: Pick<Scope, "groups" | "ids">,
): IngredientCategoryBuild {
  const index = vocabulary.tagIndex;
  const root = index.findByName("食材");
  if (!root) throw new Error("Missing 食材 GameplayTag root");
  const categories = index.subtree(root.id);
  const categoryIds = new Set(categories.map((node) => node.id));
  const formalIds = new Set([...scope.ids].filter((id) => scope.groups.get(id)?.endsWith(".item")));
  const allIdsByCategory = new Map<number, Set<number>>(
    categories.map((node) => [node.id, new Set<number>()]),
  );
  const formalIdsByCategory = new Map<number, Set<number>>(
    categories.map((node) => [node.id, new Set<number>()]),
  );
  const associations: IngredientCategoryBuild["associations"] = [];
  for (const row of tables.rows(profile.roots.items)) {
    const id = tables.uint(row, 0);
    if (id === null) continue;
    const tags = [
      ...vocabulary.tags(row, profile.fields.items.tagType),
      ...vocabulary.tags(row, 15),
    ];
    const matched = new Set<number>();
    for (const tagName of tags) {
      const node = index.findByName(tagName);
      if (!node) continue;
      for (const ancestor of index.ancestors(node.id))
        if (categoryIds.has(ancestor.id)) matched.add(ancestor.id);
    }
    for (const categoryId of matched) {
      allIdsByCategory.get(categoryId)!.add(id);
      const listed = formalIds.has(id);
      if (listed) formalIdsByCategory.get(categoryId)!.add(id);
      associations.push({ categoryId, itemId: id, listed, rowOffset: row.rowOffset });
    }
  }
  const result = categories
    .sort((a, b) => a.id - b.id)
    .map((node): IngredientCategory => ({
      id: node.id,
      tagName: node.internalName,
      name: vocabulary.translateTag(node.internalName) ?? fallbackCategoryName(node.internalName),
      parentId: node.parentId !== null && categoryIds.has(node.parentId) ? node.parentId : null,
      itemIds: [...formalIdsByCategory.get(node.id)!].sort((a, b) => a - b),
    }));
  const byTagName = new Map(result.map((category) => [category.tagName, category]));
  const unlistedReferences = result
    .map((category) => ({
      categoryId: category.id,
      tagName: category.tagName,
      itemIds: [...allIdsByCategory.get(category.id)!]
        .filter((id) => !formalIds.has(id))
        .sort((a, b) => a - b),
    }))
    .filter((entry) => entry.itemIds.length > 0);
  return { categories: result, byTagName, unlistedReferences, associations };
}

export function parseIngredientExpression(
  rawExpression: string,
  categories: ReadonlyMap<string, IngredientCategory>,
): ParsedIngredientExpression {
  const raw = rawExpression.trim();
  if (!raw) return { expression: null, reason: "empty_expression" };
  if (/[()]/.test(raw)) return { expression: null, reason: "parentheses_not_supported" };
  const alternatives = raw.split("|");
  if (alternatives.some((part) => !part.trim()))
    return { expression: null, reason: "empty_expression_term" };
  const parsedAlternatives: IngredientExpression[] = [];
  for (const alternative of alternatives) {
    const required = alternative.split("&");
    if (required.some((part) => !part.trim()))
      return { expression: null, reason: "empty_expression_term" };
    const terms: IngredientExpression[] = [];
    for (const part of required) {
      const tagName = part.trim();
      if (!/^[^&|()]+$/.test(tagName)) return { expression: null, reason: "invalid_expression" };
      const category = categories.get(tagName);
      if (!category) return { expression: null, reason: `unknown_category:${tagName}` };
      terms.push({ kind: "tag", tagId: category.id });
    }
    parsedAlternatives.push(terms.length === 1 ? terms[0] : { kind: "all", terms });
  }
  return {
    expression:
      parsedAlternatives.length === 1
        ? parsedAlternatives[0]
        : { kind: "any", terms: parsedAlternatives },
    reason: null,
  };
}

export function ingredientExpressionItemIds(
  expression: IngredientExpression,
  categories: ReadonlyMap<number, { itemIds: number[] }>,
): ItemId[] {
  if (expression.kind === "tag") return [...(categories.get(expression.tagId)?.itemIds ?? [])];
  const values = expression.terms.map(
    (term) => new Set(ingredientExpressionItemIds(term, categories)),
  );
  if (expression.kind === "any")
    return [...new Set(values.flatMap((set) => [...set]))].sort((a, b) => a - b);
  const [first, ...rest] = values;
  return [...first].filter((id) => rest.every((set) => set.has(id))).sort((a, b) => a - b);
}

export function recipeSlots(
  recipe: Row,
  tables: Pick<Tables, "string">,
  categories: ReadonlyMap<string, IngredientCategory>,
  byId: ReadonlyMap<number, IngredientCategory>,
): {
  slots: RecipeSlot[] | null;
  fields: {
    field: RecipeSlot["field"];
    rawExpression: string | null;
    parsed: ParsedIngredientExpression;
  }[];
} {
  const slots: RecipeSlot[] = [];
  const fields: {
    field: RecipeSlot["field"];
    rawExpression: string | null;
    parsed: ParsedIngredientExpression;
  }[] = [];
  for (const field of [20, 25, 30, 35] as const) {
    const rawExpression = tables.string(recipe, field);
    if (rawExpression === null) continue;
    const parsed = parseIngredientExpression(rawExpression, categories);
    fields.push({ field, rawExpression, parsed });
    slots.push({
      field,
      rawExpression,
      expression: parsed.expression,
      itemIds:
        parsed.expression === null ? null : ingredientExpressionItemIds(parsed.expression, byId),
      quantity: null,
    });
  }
  return { slots: slots.length ? slots : null, fields };
}

export interface CookingAuditInput {
  tables: Pick<Tables, "uint" | "string" | "rows">;
  recipeRows: TableRow[];
  scope: Pick<Scope, "groups">;
  categoryBuild: IngredientCategoryBuild;
  tagSources: (id: number) => import("../evidence/domain-schema.ts").EvidenceSource[];
}

export function buildCookingAudit(input: CookingAuditInput) {
  const { tables, recipeRows, scope, categoryBuild, tagSources } = input;
  const categoriesById = new Map(
    categoryBuild.categories.map((category) => [category.id, category]),
  );
  const records = recipeRows.map((row) => {
    const recipeId = tables.uint(row, 0);
    const productId = tables.uint(row, 4);
    if (recipeId === null || productId === null) throw new Error("Recipe row missing ID/product");
    const group = scope.groups.get(productId) ?? null;
    const slotData = recipeSlots(row, tables, categoryBuild.byTagName, categoriesById);
    return {
      recipeId,
      productId,
      productGroup: group,
      disposition:
        group === "dishes.item"
          ? "recipe"
          : group === "plants.item"
            ? "plant_ingredient_candidate"
            : "outside_scope",
      fields: {
        difficultyId: tables.uint(row, 2),
        cookwareId: tables.uint(row, 16),
        ingredientSlots: slotData.fields.map((entry) => ({
          field: entry.field,
          rawExpression: entry.rawExpression,
          expression: entry.parsed.expression,
          itemIds:
            entry.parsed.expression === null
              ? null
              : ingredientExpressionItemIds(entry.parsed.expression, categoriesById),
          parseReason: entry.parsed.reason,
          semanticStatus: "unconfirmed",
          semanticReason:
            "Expression syntax is parsed from client configuration; runtime ingredient-slot meaning and quantities are unconfirmed",
        })),
      },
      source: {
        file: "prepared/ed.obb",
        table: profile.roots.recipes,
        row: recipeId,
        rowOffset: row.rowOffset,
        fields: [0, 2, 4, 16, 20, 25, 30, 35],
      },
    };
  });
  const dishRecords = records.filter((record) => record.disposition === "recipe");
  const plantCandidates = records.filter(
    (record) => record.disposition === "plant_ingredient_candidate",
  );
  const outsideRecords = records.filter((record) => record.disposition === "outside_scope");
  const dishRecordsWithExpressions = dishRecords.filter(
    (record) => record.fields.ingredientSlots.length > 0,
  );
  return {
    schemaVersion: 1,
    source: { gameVersion: profile.gameVersion, dataRevision: profile.dataRevision },
    counts: {
      table122Rows: records.length,
      dishRecipes: dishRecords.length,
      dishRecipesWithExpressions: dishRecordsWithExpressions.length,
      dishRecipesWithoutExpressions: dishRecords.length - dishRecordsWithExpressions.length,
      plantProductCandidates: plantCandidates.length,
      outsideScopeProducts: outsideRecords.length,
    },
    categories: categoryBuild.categories.map((category) => ({
      id: category.id,
      tagName: category.tagName,
      name: category.name,
      parentId: category.parentId,
      itemIds: category.itemIds,
      unlistedItemIds:
        categoryBuild.unlistedReferences.find((entry) => entry.categoryId === category.id)
          ?.itemIds ?? [],
      sources: [
        {
          file: "prepared/ed.obb",
          table: profile.roots.items,
          fields: [0, profile.fields.items.tagType, 15],
          note: "Item GameplayTags expanded through the GameplayTag ancestry tree",
        },
        ...tagSources(category.id),
      ],
    })),
    categoryAssociations: categoryBuild.associations.map((association) => ({
      categoryId: association.categoryId,
      itemId: association.itemId,
      listed: association.listed,
      source: {
        file: "prepared/ed.obb",
        table: profile.roots.items,
        row: association.itemId,
        rowOffset: association.rowOffset,
        fields: [profile.fields.items.id, profile.fields.items.tagType, 15],
      },
    })),
    records,
    outsideDishProducts: outsideRecords.map((record) => ({
      productId: record.productId,
      recipeId: record.recipeId,
      productGroup: record.productGroup,
      source: record.source,
      reason: "Recipe product is outside the formal dishes.item record set",
    })),
    plantProductCandidates: plantCandidates.map((record) => ({
      productId: record.productId,
      recipeId: record.recipeId,
      source: record.source,
      reason: "Plant product is a formal ingredient item and is not assigned a recipe field",
    })),
  };
}
