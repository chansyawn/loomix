import { z } from "zod";

export const ingredientFilterKeys = ["types", "colors", "qualities"] as const;
export type IngredientFilterKey = (typeof ingredientFilterKeys)[number];

export const ingredientSortOptions = {
  original: "默认顺序",
  "name-asc": "名称：升序",
  "name-desc": "名称：降序",
  "recipes-desc": "关联配方：从多到少",
};
const selections = z
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
  types: selections.default([]),
  colors: selections.default([]),
  qualities: selections.default([]),
});
export type IngredientsQuery = z.output<typeof ingredientsQuerySchema>;
export const emptyIngredientsQuery = (): IngredientsQuery => ingredientsQuerySchema.parse({});

export function ingredientFiltersForTag(
  categoryId: number,
  filterKey: IngredientFilterKey,
): IngredientsQuery {
  return { ...emptyIngredientsQuery(), [filterKey]: [String(categoryId)] };
}

export function compactIngredientsQuery(query: IngredientsQuery): Partial<IngredientsQuery> {
  return {
    ...(query.q ? { q: query.q } : {}),
    ...(query.sort !== "original" ? { sort: query.sort } : {}),
    ...(query.types.length ? { types: query.types } : {}),
    ...(query.colors.length ? { colors: query.colors } : {}),
    ...(query.qualities.length ? { qualities: query.qualities } : {}),
  };
}
