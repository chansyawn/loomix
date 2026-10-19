import type { FurnitureItem, FurnitureSet } from "@petit-orbit/content-schema";
import type { FurnitureData } from "./data";
import { categories, missing, ungrouped } from "./search";
import type { FilterKey, View, ViewQuery } from "./search";

export const qualityNames = ["普通", "优质", "珍稀", "特等", "奇迹"];
export type Option = { value: string; label: string };
export type FilterGroup = { key: FilterKey; label: string; options: Option[] };

export function splitValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [missing];
}

export function membershipIndex(sets: FurnitureSet[]): Map<number, FurnitureSet[]> {
  const index = new Map<number, FurnitureSet[]>();
  for (const set of sets)
    for (const id of set.componentIds ?? []) index.set(id, [...(index.get(id) ?? []), set]);
  return index;
}

function options(values: (string | null)[]): Option[] {
  return [...new Set(values.map((value) => value ?? missing))]
    .sort((a, b) => (a === missing ? 1 : b === missing ? -1 : a.localeCompare(b, "zh-CN")))
    .map((value) => ({ value, label: value === missing ? "未提供" : value }));
}

export function filterGroups(data: FurnitureData): FilterGroup[] {
  return [
    {
      key: "categories",
      label: "分类",
      options: categories.map((value) => ({ value, label: value })),
    },
    { key: "types", label: "类型", options: options(data.items.map((row) => row.type)) },
    {
      key: "qualities",
      label: "品阶",
      options: qualityNames
        .map((label, value) => ({ value: String(value), label }))
        .concat(
          [...data.items, ...data.sets].some((row) => row.quality === null)
            ? [{ value: missing, label: "未提供" }]
            : [],
        ),
    },
    {
      key: "sets",
      label: "所属套装",
      options: data.sets
        .map((set) => ({ value: String(set.id), label: set.name }))
        .concat([{ value: ungrouped, label: "未归入套装" }]),
    },
    {
      key: "colors",
      label: "颜色",
      options: options(data.items.flatMap((row) => splitValues(row.colors))),
    },
    {
      key: "materials",
      label: "材质",
      options: options(data.items.flatMap((row) => splitValues(row.materials))),
    },
    { key: "sources", label: "获取途径", options: options(data.items.map((row) => row.sources)) },
  ];
}

function matches(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function queryFurniture(data: FurnitureData, view: View, query: ViewQuery) {
  const memberships = membershipIndex(data.sets);
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows: (FurnitureItem | FurnitureSet)[] = view === "items" ? data.items : data.sets;
  const filtered = rows.filter((row) => {
    if (
      !row.name.toLocaleLowerCase("zh-CN").includes(term) ||
      !matches(query.qualities, [row.quality === null ? missing : String(row.quality)])
    )
      return false;
    if (!("category" in row)) return true;
    const memberSets = memberships.get(row.id);
    return (
      matches(query.categories, [row.category ?? missing]) &&
      matches(query.types, [row.type ?? missing]) &&
      matches(query.sets, memberSets?.map((set) => String(set.id)) ?? [ungrouped]) &&
      matches(query.colors, splitValues(row.colors)) &&
      matches(query.materials, splitValues(row.materials)) &&
      matches(query.sources, [row.sources ?? missing])
    );
  });
  if (query.sort !== "original")
    filtered.sort((a, b) => {
      const direction = query.sort.endsWith("desc") ? -1 : 1;
      if (query.sort.startsWith("name")) return direction * a.name.localeCompare(b.name, "zh-CN");
      if (a.quality === null) return b.quality === null ? 0 : 1;
      if (b.quality === null) return -1;
      return direction * (a.quality - b.quality);
    });
  return {
    rows: filtered,
    total: filtered.length,
    memberships,
  };
}
