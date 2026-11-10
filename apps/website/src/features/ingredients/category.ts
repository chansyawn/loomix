import type { IngredientCategory as IngredientMembership } from "@loomix/schema/catalog";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";

export interface IngredientCategory {
  id: number;
  tagName: string;
  name: string;
  parentId: number | null;
  itemIds: number[];
}

export function ingredientCategories(
  memberships: readonly IngredientMembership[],
  tags: GameplayTagIndex,
): IngredientCategory[] {
  const ids = new Set(memberships.map((category) => category.tagId));
  return memberships.map(({ tagId, itemIds }) => {
    const tag = tags.get(tagId);
    return {
      id: tag.id,
      tagName: tag.internalName,
      name: tag.displayName ?? (tag.internalName.replace(/^食材_?/, "") || tag.internalName),
      parentId: tag.parentId !== null && ids.has(tag.parentId) ? tag.parentId : null,
      itemIds,
    };
  });
}
