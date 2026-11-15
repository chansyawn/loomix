import { z } from "zod";
import type { IngredientTag } from "./tag-source";

export const ingredientSortOptions = {
  original: "默认顺序",
  "name-asc": "名称：升序",
  "name-desc": "名称：降序",
  "recipes-desc": "关联配方：从多到少",
};

export const ingredientTagIdsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((values) => [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" &&
          /^[1-9]\d*$/.test(value) &&
          Number.isSafeInteger(Number(value)),
      ),
    ),
  ]);

export const ingredientsQuerySchema = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(["original", "name-asc", "name-desc", "recipes-desc"])
    .catch("original")
    .default("original"),
  ingredientCategories: ingredientTagIdsSchema.default([]),
  ingredientColors: ingredientTagIdsSchema.default([]),
  ingredientQualities: ingredientTagIdsSchema.default([]),
});
export type IngredientsQuery = z.output<typeof ingredientsQuerySchema>;
export const emptyIngredientsQuery = (): IngredientsQuery => ingredientsQuerySchema.parse({});

export function ingredientFiltersForTag(
  tag: Pick<IngredientTag, "id" | "group">,
): Partial<IngredientsQuery> {
  return { [tag.group]: [String(tag.id)] } as Partial<IngredientsQuery>;
}

export function compactIngredientsQuery(query: IngredientsQuery): Partial<IngredientsQuery> {
  return {
    ...(query.q ? { q: query.q } : {}),
    ...(query.sort !== "original" ? { sort: query.sort } : {}),
    ...(query.ingredientCategories.length
      ? { ingredientCategories: query.ingredientCategories }
      : {}),
    ...(query.ingredientColors.length ? { ingredientColors: query.ingredientColors } : {}),
    ...(query.ingredientQualities.length ? { ingredientQualities: query.ingredientQualities } : {}),
  };
}
