import type { FilterGroup, FilterOption } from "../collection/filter-types";
import { qualityNames } from "../collection/quality";
import type { AllQuery, FilterKey } from "./search";
import {
  categoryNames,
  kindNames,
  type CollectionCatalog,
  type OverviewRecord,
} from "../collection/catalog";

const intersects = (selected: string[], values: string[]) =>
  !selected.length || values.some((value) => selected.includes(value));
export function queryAll(data: CollectionCatalog, input: AllQuery) {
  const query = normalizeAllQuery(data, input);
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows = data.rows.filter((row) => {
    const text = [
      String(row.id),
      row.name,
      row.description,
      ...row.directTags.flatMap((id) => {
        const tag = data.tagsById.get(id);
        return tag ? [tag.name, tag.enumName, tag.displayName] : [];
      }),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    return (
      text.includes(term) &&
      intersects(query.categories, [row.category]) &&
      intersects(query.kinds, [row.kind]) &&
      intersects(query.qualities, [row.quality === null ? "__missing" : String(row.quality)]) &&
      intersects(query.colors, row.colors) &&
      intersects(query.materials, row.materials) &&
      intersects(query.styles, row.styles) &&
      intersects(
        query.acquisition,
        row.acquisition?.map((source) => String(source.sourceId)) ?? [],
      ) &&
      intersects(query.gameplayTags, [...row.inheritedTags].map(String))
    );
  });
  if (query.sort !== "original")
    rows.sort((a, b) => {
      const direction = query.sort.endsWith("desc") ? -1 : 1;
      if (query.sort.startsWith("name"))
        return direction * a.name.localeCompare(b.name, "zh-CN") || a.id - b.id;
      if (a.quality === null) return b.quality === null ? a.id - b.id : 1;
      if (b.quality === null) return -1;
      return direction * (a.quality - b.quality) || a.id - b.id;
    });
  else rows.sort((a, b) => a.id - b.id);
  return { rows, total: rows.length };
}
export function filterGroups(data: CollectionCatalog): FilterGroup<FilterKey>[] {
  const options = (values: Record<string, string>) =>
    Object.entries(values).map(([value, label]) => ({ value, label }));
  const properties = (key: "colors" | "materials" | "styles") =>
    [...new Set(data.rows.flatMap((row) => row[key]))]
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((value) => ({ value, label: value }));
  const nodes = new Map<number, FilterOption>(
    data.catalog.gameplayTags.map((tag) => [
      tag.id,
      { value: String(tag.id), label: tag.displayName ?? tag.name, children: [] },
    ]),
  );
  const roots: FilterOption[] = [];
  for (const tag of data.catalog.gameplayTags) {
    const node = nodes.get(tag.id)!;
    const parent = tag.parentId === null ? undefined : nodes.get(tag.parentId);
    if (parent) parent.children!.push(node);
    else roots.push(node);
  }
  const sources = new Map(
    data.rows
      .flatMap((row) => row.acquisition ?? [])
      .map((source) => [String(source.sourceId), source.label]),
  );
  return [
    { key: "categories", label: "类别", options: options(categoryNames) },
    { key: "kinds", label: "记录形式", options: options(kindNames) },
    {
      key: "qualities",
      label: "品阶",
      options: [
        ...qualityNames.map((label, id) => ({ value: String(id), label })),
        ...(data.rows.some((row) => row.quality === null)
          ? [{ value: "__missing", label: "未提供" }]
          : []),
      ],
    },
    { key: "colors", label: "颜色", options: properties("colors") },
    { key: "materials", label: "材质", options: properties("materials") },
    { key: "styles", label: "风格", options: properties("styles") },
    {
      key: "acquisition",
      label: "获取来源",
      options: [...sources].map(([value, label]) => ({ value, label })),
    },
    { key: "gameplayTags", label: "GameplayTag", options: roots, tree: true, fullWidth: true },
  ];
}
export function overviewTags(row: OverviewRecord) {
  return `${categoryNames[row.category]} · ${kindNames[row.kind]}`;
}

export function normalizeAllQuery(data: CollectionCatalog, query: AllQuery): AllQuery {
  const selected = new Set<number>();
  const children = new Map<number, number[]>();
  for (const tag of data.catalog.gameplayTags) {
    if (tag.parentId === null) continue;
    const values = children.get(tag.parentId) ?? [];
    values.push(tag.id);
    children.set(tag.parentId, values);
  }
  const pending = query.gameplayTags.map(Number).filter((id) => data.tagsById.has(id));
  while (pending.length) {
    const id = pending.pop()!;
    if (selected.has(id)) continue;
    selected.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return { ...query, gameplayTags: [...selected].sort((a, b) => a - b).map(String) };
}
