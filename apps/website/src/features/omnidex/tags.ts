import {
  tagLabel,
  type GameplayTag,
  type GameplayTagIndex,
  type GameplayTags,
} from "@loomix/schema/gameplay-tags";
import type { FilterOption } from "./filter-types";

export type TagMatchMode = "and" | "or";

export interface TagLabelPolicy {
  labelOverrides?: Readonly<Record<string, string>>;
  labelPrefixes?: readonly string[];
}

export interface TagTreePolicy extends TagLabelPolicy {
  rootNames: readonly string[];
}

export const TAG_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  产区分类: "产区",
  种植作物分类: "作物分类",
  生物移动模式: "移动方式",
  鱼版型分类: "鱼体型",
  生物花纹: "花纹",
  活动时间: "活跃时间",
  赶海生物特征: "赶海特征",
  含水果父级: "含水果类",
  含谷物父级: "含谷物类",
  含蔬菜父级: "含蔬菜类",
  含海鲜父级: "含海鲜类",
  容器_水果: "水果容器",
  食材_颜色: "颜色分类",
  Diy素材: "DIY 材料",
  手部饰品: "手部配饰",
};

export const TAG_LABEL_PREFIXES = ["食材_", "容器_", "食物_"] as const;

export function resolveTagFilterLabel(tag: GameplayTag, policy?: TagLabelPolicy): string {
  const override = policy?.labelOverrides?.[tag.internalName];
  if (override) return override;
  const base = tagLabel(tag);
  const prefix = policy?.labelPrefixes?.find((value) => base.startsWith(value));
  return prefix ? base.slice(prefix.length) : base;
}

export function visibleTagIds(
  index: GameplayTagIndex,
  records: readonly { tagIds: readonly number[] }[],
  policy?: TagTreePolicy,
) {
  if (!policy) return new Set(index.tags.map((tag) => tag.id));
  const allowedRoots = new Set(policy.rootNames);
  const visible = new Set<number>();
  for (const id of new Set(records.flatMap((record) => record.tagIds))) {
    const path = index.ancestors(id);
    if (allowedRoots.has(path.at(-1)!.internalName)) for (const tag of path) visible.add(tag.id);
  }
  return visible;
}

export function createOmnidexTagFilter(
  tags: GameplayTags["tags"],
  index: GameplayTagIndex,
  records: readonly { id: number; tagIds: readonly number[] }[],
  policy?: TagTreePolicy,
) {
  const label = (tag: GameplayTag) => resolveTagFilterLabel(tag, policy);
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
  const visibleIds = visibleTagIds(index, records, policy);
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
    visibleOption(id: number) {
      return visibleIds.has(id) ? optionsById.get(id) : undefined;
    },
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
