import { isListedItem } from "@loomix/schema/catalog";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { ALL_TAG_FILTER_POLICY } from "../../../../src/features/all/tag-filter-policy.ts";
import {
  flattenFilterOptions,
  type FilterOption,
} from "../../../../src/features/collection/filter-types.ts";
import { createCollectionTagFilter } from "../../../../src/features/collection/tags.ts";
import type { ReleaseCheck, ReleaseCheckIssue, ReleaseCheckResult } from "../../types.ts";
import type { TagFilterInput } from "./types.ts";

function checkSiblingLabels(
  nodes: readonly FilterOption[],
  parent: string | null,
  issues: ReleaseCheckIssue[],
): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.label))
      issues.push({ path: parent ?? "根", message: `同级重名：${node.label}` });
    seen.add(node.label);
    if (node.children?.length) checkSiblingLabels(node.children, node.label, issues);
  }
}

export function checkAllTagFilter({ tags, records }: TagFilterInput): ReleaseCheckResult {
  const issues: ReleaseCheckIssue[] = [];
  const tagIndex = createGameplayTagIndex(tags);
  const filter = createCollectionTagFilter([...tags], tagIndex, records, ALL_TAG_FILTER_POLICY);
  const options = filter.options();
  const flattened = flattenFilterOptions(options);
  const visibleIds = new Set(flattened.map((option) => option.value));

  for (const name of ALL_TAG_FILTER_POLICY.rootNames) {
    const root = tags.find((tag) => tag.parentId === null && tag.internalName === name);
    if (!root) issues.push({ path: "gameplay-tags", message: `白名单根不存在：${name}` });
    else if (!visibleIds.has(String(root.id)))
      issues.push({ path: name, message: "白名单根当前没有可见标签" });
  }

  for (const option of flattened)
    if (/[_]|父级/.test(option.label))
      issues.push({
        path: `标签 ${option.value}`,
        message: `可见标签仍含内部命名：${option.label}`,
      });

  checkSiblingLabels(options, null, issues);

  return {
    issues,
    summary: `${options.length} 个根，${flattened.length} 个可见标签，${records.length} 条正式物品`,
  };
}

export const allTagFilterCheck: ReleaseCheck = {
  id: "tag-filter/all",
  run: (release) =>
    checkAllTagFilter({
      tags: release.dataset.gameplayTags.tags,
      records: release.dataset.catalog.items.filter(isListedItem),
    }),
};
