import { isListedItem } from "@loomix/schema/catalog";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import {
  INGREDIENT_TAG_GROUPS,
  INGREDIENT_USAGE_EXCLUDED,
} from "../../../../src/features/ingredients/tag-filter-policy.ts";
import { createIngredientTagSource } from "../../../../src/features/ingredients/tag-source.ts";
import type { ReleaseCheck, ReleaseCheckIssue, ReleaseCheckResult } from "../../types.ts";
import type { TagFilterInput } from "./types.ts";

export function checkIngredientTagFilter({ tags, records }: TagFilterInput): ReleaseCheckResult {
  const issues: ReleaseCheckIssue[] = [];
  const tagIndex = createGameplayTagIndex(tags);
  const ingredientRoot = tagIndex.findByName("食材");
  if (!ingredientRoot) {
    return { issues: [{ path: "gameplay-tags", message: "食材根不存在" }] };
  }

  const subtreeIds = new Set(tagIndex.subtree(ingredientRoot.id).map((tag) => tag.id));
  const directChildren = (id: number) => tags.filter((tag) => tag.parentId === id);
  const claimed = new Set<number>();

  for (const group of INGREDIENT_TAG_GROUPS) {
    if (group.kind === "roots") {
      for (const name of group.rootNames) {
        const tag = tagIndex.findByName(name);
        if (!tag) {
          issues.push({ path: group.label, message: `食材分组根不存在：${name}` });
          continue;
        }
        if (tag.parentId !== ingredientRoot.id)
          issues.push({ path: group.label, message: `食材分组根不是食材的直接子级：${name}` });
        claimed.add(tag.id);
      }
      continue;
    }
    const tag = tagIndex.findByName(group.rootName);
    if (!tag) {
      issues.push({ path: group.label, message: `食材分组根不存在：${group.rootName}` });
      continue;
    }
    if (tag.parentId !== ingredientRoot.id)
      issues.push({
        path: group.label,
        message: `食材分组根不是食材的直接子级：${group.rootName}`,
      });
    if (directChildren(tag.id).length === 0)
      issues.push({ path: group.label, message: `食材分组没有子级：${group.label}` });
    claimed.add(tag.id);
  }

  for (const name of INGREDIENT_USAGE_EXCLUDED) {
    const tag = tagIndex.findByName(name);
    if (!tag) issues.push({ path: "食材排除标签", message: `食材排除标签不存在：${name}` });
    else if (!subtreeIds.has(tag.id))
      issues.push({ path: "食材排除标签", message: `食材排除标签不在食材子树内：${name}` });
  }

  for (const tag of directChildren(ingredientRoot.id)) {
    if (claimed.has(tag.id)) continue;
    issues.push({
      path: "gameplay-tags:食材",
      message: `食材一级标签未归属分组：${tag.internalName}（${tag.displayName ?? "无显示名"}）`,
    });
  }

  const source = createIngredientTagSource(tagIndex, records);
  for (const group of INGREDIENT_TAG_GROUPS) {
    if (source.groupRootIds[group.key].length === 0)
      issues.push({ path: group.label, message: `食材分组没有可见选项：${group.label}` });
  }

  const recordIds = new Set(records.map((record) => record.id));
  const ingredientCount = source.itemIds.filter((id) => recordIds.has(id)).length;
  return {
    issues,
    summary: `${INGREDIENT_TAG_GROUPS.length} 组，${source.visibleIds.size} 个可见标签，${ingredientCount} 种食材`,
  };
}

export const ingredientTagFilterCheck: ReleaseCheck = {
  id: "tag-filter/ingredients",
  run: (release) =>
    checkIngredientTagFilter({
      tags: release.dataset.gameplayTags.tags,
      records: release.dataset.catalog.items.filter(isListedItem),
    }),
};
