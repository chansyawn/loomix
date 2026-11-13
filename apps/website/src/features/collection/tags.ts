import {
  tagLabel,
  type GameplayTag,
  type GameplayTagIndex,
  type GameplayTags,
} from "@loomix/schema/gameplay-tags";
import type { CatalogRecord } from "@loomix/schema/catalog";
import type { FilterOption } from "./filter-types";
import { collectionTagBranches } from "./tag-policy";

export type TagMatchMode = "and" | "or";

function recordTagAncestry(
  records: readonly Pick<CatalogRecord, "id" | "tagIds">[],
  index: GameplayTagIndex,
) {
  return new Map(
    records.map((record) => [
      record.id,
      new Set(record.tagIds.flatMap((id) => index.ancestors(id).map((tag) => String(tag.id)))),
    ]),
  );
}

function publicTagOptions(
  tags: GameplayTags["tags"],
  index: GameplayTagIndex,
  counts: ReadonlyMap<string, number>,
  preferenceTagIds: readonly number[],
) {
  const preferences = new Set(preferenceTagIds);
  for (const id of preferences) index.get(id);
  const childrenById = new Map<number, GameplayTag[]>();
  for (const tag of tags) {
    if (tag.parentId === null) continue;
    const children = childrenById.get(tag.parentId) ?? [];
    children.push(tag);
    childrenById.set(tag.parentId, children);
  }
  const optionsById = new Map<string, FilterOption>();
  const covered = new Set<number>();
  const makeOption = (tag: GameplayTag, path: readonly string[]): FilterOption => {
    const name = tagLabel(tag);
    const count = counts.get(String(tag.id)) ?? 0;
    const option: FilterOption = {
      value: String(tag.id),
      label: count === 0 ? `${name}（暂无收录物品）` : name,
      chipLabel: `标签：${[...path, name].join(" / ")}`,
      count,
      children: [],
    };
    optionsById.set(option.value, option);
    return option;
  };
  const project = (tag: GameplayTag, path: readonly string[]): FilterOption[] => {
    covered.add(tag.id);
    const visible =
      preferences.has(tag.id) || (tag.displayName !== null && counts.has(String(tag.id)));
    const option = visible ? makeOption(tag, path) : null;
    const childPath = visible ? [...path, tagLabel(tag)] : path;
    const children = (childrenById.get(tag.id) ?? []).flatMap((child) => project(child, childPath));
    if (!option) return children;
    option.children = children;
    return [option];
  };
  const roots = collectionTagBranches.flatMap(({ name, label }): FilterOption[] => {
    const tag = index.findByName(name);
    if (!tag) return [];
    const selectable =
      preferences.has(tag.id) || (tag.displayName !== null && counts.has(String(tag.id)));
    const children = project(tag, selectable ? [] : [label]);
    if (selectable || children.length === 0) return children;
    return [{ value: `__tag_branch_${tag.id}`, label, selectable: false, children }];
  });
  const otherPreferences = tags
    .filter((tag) => preferences.has(tag.id) && !covered.has(tag.id))
    .map((tag) => makeOption(tag, ["其他偏好"]));
  if (otherPreferences.length)
    roots.push({
      value: "__tag_preferences",
      label: "其他偏好",
      selectable: false,
      children: otherPreferences,
    });
  return { roots, optionsById };
}

export function createCollectionTagFilter(
  tags: GameplayTags["tags"],
  index: GameplayTagIndex,
  records: readonly Pick<CatalogRecord, "id" | "tagIds">[],
  preferenceTagIds: readonly number[] = [],
) {
  const ancestryByRecord = recordTagAncestry(records, index);
  const counts = new Map<string, number>();
  for (const ancestry of ancestryByRecord.values())
    for (const id of ancestry) counts.set(id, (counts.get(id) ?? 0) + 1);
  const { roots, optionsById } = publicTagOptions(tags, index, counts, preferenceTagIds);
  return {
    options(selectedIds: readonly string[] = []): FilterOption[] {
      const unavailable = [...new Set(selectedIds)].filter((id) => !optionsById.has(id));
      return [
        ...roots,
        ...unavailable.map((id) => ({
          value: id,
          label: `不可用标签（${id}）`,
          chipLabel: `不可用标签（${id}）`,
          disabled: true,
        })),
      ];
    },
    matches(recordId: number, selectedIds: readonly string[], mode: TagMatchMode): boolean {
      if (selectedIds.length === 0) return true;
      const ancestry = ancestryByRecord.get(recordId);
      const matches = (id: string) => optionsById.has(id) && (ancestry?.has(id) ?? false);
      return mode === "and" ? selectedIds.every(matches) : selectedIds.some(matches);
    },
  };
}
