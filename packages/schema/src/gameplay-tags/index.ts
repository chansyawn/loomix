import { z } from "zod";
import { IdSchema, assertValid } from "../common/identity.ts";
import { validateGameplayTags } from "./validate.ts";

export const GameplayTagSchema = z.strictObject({
  id: IdSchema,
  internalName: z.string().min(1),
  parentId: IdSchema.nullable(),
  displayName: z.string().min(1).nullable(),
});
export const GameplayTagsSchema = z.strictObject({ tags: GameplayTagSchema.array() });
export type GameplayTag = z.infer<typeof GameplayTagSchema>;
export type GameplayTags = z.infer<typeof GameplayTagsSchema>;
export function parseGameplayTags(input: unknown): GameplayTags {
  const document = GameplayTagsSchema.parse(input);
  assertValid(validateGameplayTags(document.tags));
  return document;
}
export const tagLabel = (tag: GameplayTag): string => tag.displayName ?? tag.internalName;
export { createGameplayTagIndex } from "./query.ts";
export type { GameplayTagIndex } from "./query.ts";
export { validateGameplayTags } from "./validate.ts";
