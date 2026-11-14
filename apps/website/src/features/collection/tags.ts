import {
  tagLabel,
  type GameplayTag,
  type GameplayTagIndex,
  type GameplayTags,
} from "@loomix/schema/gameplay-tags";
import type { CatalogRecord } from "@loomix/schema/catalog";
import type { FilterOption } from "./filter-types";

export type TagMatchMode = "and" | "or";

export interface TagTreePolicy {
  rootNames: readonly string[];
  labelOverrides?: Readonly<Record<string, string>>;
  labelPrefixes?: readonly string[];
}

export function resolveTagFilterLabel(tag: GameplayTag, policy?: TagTreePolicy): string {
  const override = policy?.labelOverrides?.[tag.internalName];
  if (override) return override;
  const base = tagLabel(tag);
  const prefix = policy?.labelPrefixes?.find((value) => base.startsWith(value));
  return prefix ? base.slice(prefix.length) : base;
}

export function createCollectionTagFilter(
  tags: GameplayTags["tags"],
  index: GameplayTagIndex,
  records: readonly Pick<CatalogRecord, "id" | "tagIds">[],
  policy?: TagTreePolicy,
) {
  const label = (tag: GameplayTag) => resolveTagFilterLabel(tag, policy);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const optionsById = new Map<number, FilterOption>();
  for (const tag of tags) {
    const path = index.ancestors(tag.id).reverse().map(label);
    optionsById.set(tag.id, {
      value: String(tag.id),
      label: label(tag),
      chipLabel: `标签：${path.join(" / ")}`,
      children: [],
    });
  }
  const childrenByParent = new Map<number, number[]>();
  for (const tag of tags) {
    if (tag.parentId === null) continue;
    const children = childrenByParent.get(tag.parentId) ?? [];
    children.push(tag.id);
    childrenByParent.set(tag.parentId, children);
  }
  const visibleIds = new Set<number>();
  if (policy) {
    const allowedRoots = new Set(policy.rootNames);
    const referenced = new Set(records.flatMap((record) => record.tagIds));
    const visit = (tag: GameplayTag): boolean => {
      let childVisible = false;
      for (const childId of childrenByParent.get(tag.id) ?? [])
        if (visit(tagsById.get(childId)!)) childVisible = true;
      const visible = referenced.has(tag.id) || childVisible;
      if (visible) visibleIds.add(tag.id);
      return visible;
    };
    for (const tag of tags)
      if (tag.parentId === null && allowedRoots.has(tag.internalName)) visit(tag);
  } else {
    for (const tag of tags) visibleIds.add(tag.id);
  }
  const roots: FilterOption[] = [];
  for (const tag of tags) {
    if (!visibleIds.has(tag.id)) continue;
    const option = optionsById.get(tag.id)!;
    if (tag.parentId === null) roots.push(option);
    else optionsById.get(tag.parentId)!.children!.push(option);
  }
  const visibleValues = new Set([...visibleIds].map(String));
  const ancestryByRecord = new Map(
    records.map((record) => [
      record.id,
      new Set(record.tagIds.flatMap((id) => index.ancestors(id).map((tag) => String(tag.id)))),
    ]),
  );
  return {
    options(selectedIds: readonly string[] = []): FilterOption[] {
      const unknown = selectedIds.filter((id) => !optionsById.has(Number(id)));
      return [
        ...roots,
        ...unknown.map((id) => ({
          value: id,
          label: `未知标签（${id}）`,
          chipLabel: `未知标签（${id}）`,
        })),
      ];
    },
    matches(recordId: number, selectedIds: readonly string[], mode: TagMatchMode): boolean {
      if (selectedIds.length === 0) return true;
      const ancestry = ancestryByRecord.get(recordId);
      const matches = (id: string) => ancestry?.has(id) ?? false;
      return mode === "and" ? selectedIds.every(matches) : selectedIds.some(matches);
    },
    acceptSelection(selectedIds: readonly string[]): string[] {
      return selectedIds.filter((id) => visibleValues.has(id));
    },
  };
}
