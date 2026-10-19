import type { FurnitureItem, FurnitureSet } from "@petit-orbit/content-schema";
import type { FurnitureData } from "./data";

export const categories = ["起居", "装饰物", "功能家具", "硬装", "绿植", "户外布设", "其他"];
export const qualityNames = ["普通", "优质", "珍稀", "特等", "奇迹"];
export const missing = "__missing";
export const ungrouped = "__ungrouped";
export const sortOptions = {
  original: "默认顺序",
  "name-asc": "名称：升序",
  "name-desc": "名称：降序",
  "quality-asc": "品阶：从低到高",
  "quality-desc": "品阶：从高到低",
};
export type Sort = keyof typeof sortOptions;
export type View = "items" | "sets";
export const filterKeys = [
  "categories",
  "types",
  "qualities",
  "sets",
  "colors",
  "materials",
  "sources",
] as const;
export type FilterKey = (typeof filterKeys)[number];
export type Filters = Record<FilterKey, string[]>;
export type ViewQuery = Filters & { q: string; sort: Sort };
export type FurnitureSearch = { view: View; items: ViewQuery; sets: ViewQuery };
export type Option = { value: string; label: string };
export type FilterGroup = { key: FilterKey; label: string; options: Option[] };

export function emptyQuery(): ViewQuery {
  return {
    q: "",
    categories: [],
    sort: "original",
    types: [],
    qualities: [],
    sets: [],
    colors: [],
    materials: [],
    sources: [],
  };
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseQuery(input: unknown, view: View): ViewQuery {
  const raw = object(input);
  const result = emptyQuery();
  result.q = typeof raw.q === "string" ? raw.q : "";
  result.sort =
    typeof raw.sort === "string" && Object.hasOwn(sortOptions, raw.sort)
      ? (raw.sort as Sort)
      : "original";
  for (const key of filterKeys) {
    const value = raw[key];
    result[key] =
      (view === "items" || key === "qualities") && Array.isArray(value)
        ? [
            ...new Set(
              value.filter(
                (entry): entry is string => typeof entry === "string" && entry.length > 0,
              ),
            ),
          ]
        : [];
  }
  const legacyCategory = typeof raw.category === "string" ? [raw.category] : [];
  const selectedCategories = Array.isArray(raw.categories) ? raw.categories : legacyCategory;
  result.categories =
    view === "items"
      ? [...new Set(selectedCategories)].filter(
          (value): value is string => typeof value === "string" && categories.includes(value),
        )
      : [];
  result.qualities = result.qualities.filter((value) => value === missing || /^[0-4]$/.test(value));
  return result;
}

export function parseFurnitureSearch(input: Record<string, unknown>): FurnitureSearch {
  return {
    view: input.view === "sets" ? "sets" : "items",
    items: parseQuery(input.items, "items"),
    sets: parseQuery(input.sets, "sets"),
  };
}

export function updateViewQuery(
  search: FurnitureSearch,
  patch: Partial<ViewQuery>,
): FurnitureSearch {
  return { ...search, [search.view]: { ...search[search.view], ...patch } };
}

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
