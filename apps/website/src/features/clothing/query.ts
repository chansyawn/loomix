import type { ClothingSet } from "../collection-view.ts";
import type { FilterGroup } from "@/ui/collection/filter-panel";
import { qualityNames } from "@/ui/collection/quality";
import type { ClothingData } from "./data";
import { missing, ungrouped } from "./search";
import type { FilterKey, View, ViewQuery } from "./search";

export function splitValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [missing];
}
export function membershipIndex(sets: ClothingSet[]): Map<number, ClothingSet[]> {
  const index = new Map<number, ClothingSet[]>();
  for (const set of sets)
    for (const id of set.componentIds ?? []) index.set(id, [...(index.get(id) ?? []), set]);
  return index;
}
function options(values: (string | null)[]) {
  return [...new Set(values.map((value) => value ?? missing))]
    .sort((a, b) => (a === missing ? 1 : b === missing ? -1 : a.localeCompare(b, "zh-CN")))
    .map((value) => ({ value, label: value === missing ? "未提供" : value }));
}
export function filterGroups(data: ClothingData, view: View): FilterGroup<FilterKey>[] {
  const groups: FilterGroup<FilterKey>[] = [];
  if (view !== "sets")
    groups.push({
      key: "categories",
      label: "分类",
      options: options(data[view].map((row) => row.category)),
    });
  groups.push({
    key: "qualities",
    label: "品阶",
    options: qualityNames
      .map((label, value) => ({ value: String(value), label }))
      .concat(
        data[view].some((row) => row.quality === null) ? [{ value: missing, label: "未提供" }] : [],
      ),
  });
  if (view === "items") {
    groups.push({
      key: "sets",
      label: "所属套装",
      options: data.sets
        .map((set) => ({ value: String(set.id), label: set.name }))
        .concat([{ value: ungrouped, label: "未归入套装" }]),
    });
    for (const [key, label] of [
      ["colors", "颜色"],
      ["materials", "材质"],
      ["styles", "风格"],
    ] as const)
      groups.push({
        key,
        label,
        options: options(data.items.flatMap((row) => splitValues(row[key]))),
      });
    groups.push({
      key: "sources",
      label: "获取途径",
      fullWidth: true,
      options: options(data.items.map((row) => row.sources)),
    });
  }
  return groups;
}
function matches(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}
export function queryClothing(data: ClothingData, view: View, query: ViewQuery) {
  const memberships = membershipIndex(data.sets);
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows = data[view].filter((row) => {
    if (
      !row.name.toLocaleLowerCase("zh-CN").includes(term) ||
      !matches(query.qualities, [row.quality === null ? missing : String(row.quality)])
    )
      return false;
    if (!("category" in row)) return true;
    if (!matches(query.categories, [row.category ?? missing])) return false;
    if (!("styles" in row)) return true;
    return (
      matches(query.sets, memberships.get(row.id)?.map((set) => String(set.id)) ?? [ungrouped]) &&
      matches(query.colors, splitValues(row.colors)) &&
      matches(query.materials, splitValues(row.materials)) &&
      matches(query.styles, splitValues(row.styles)) &&
      matches(query.sources, [row.sources ?? missing])
    );
  });
  if (query.sort !== "original")
    rows.sort((a, b) => {
      const direction = query.sort.endsWith("desc") ? -1 : 1;
      if (query.sort.startsWith("name")) return direction * a.name.localeCompare(b.name, "zh-CN");
      if (a.quality === null) return b.quality === null ? 0 : 1;
      if (b.quality === null) return -1;
      return direction * (a.quality - b.quality);
    });
  return { rows, total: rows.length };
}
