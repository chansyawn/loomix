import { isGroupRecord } from "@loomix/schema/catalog";
import type { FilterGroup } from "../collection/filter-types";
import { qualityNames } from "../collection/quality";
import type { AllQuery, FilterKey } from "./search";
import { categoryNames, type CollectionCatalog } from "../collection/catalog";

function allRecords(data: CollectionCatalog) {
  return data.rows.filter((row) => !isGroupRecord(row.record));
}

const intersects = (selected: string[], values: string[]) =>
  !selected.length || values.some((value) => selected.includes(value));
export function queryAll(data: CollectionCatalog, query: AllQuery) {
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows = allRecords(data).filter((row) => {
    const text = [String(row.id), row.name, row.description]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    return (
      text.includes(term) &&
      intersects(query.categories, [row.category]) &&
      intersects(query.qualities, [row.quality === null ? "__missing" : String(row.quality)]) &&
      intersects(query.colors, row.colors) &&
      intersects(query.materials, row.materials) &&
      intersects(query.styles, row.styles) &&
      intersects(query.acquisition, row.acquisition?.map((source) => String(source.sourceId)) ?? [])
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
  const rows = allRecords(data);
  const options = (values: Record<string, string>) =>
    Object.entries(values).map(([value, label]) => ({ value, label }));
  const properties = (key: "colors" | "materials" | "styles") =>
    [...new Set(rows.flatMap((row) => row[key]))]
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((value) => ({ value, label: value }));
  const sources = new Map(
    rows
      .flatMap((row) => row.acquisition ?? [])
      .map((source) => [String(source.sourceId), source.label]),
  );
  return [
    { key: "categories", label: "类别", options: options(categoryNames) },
    {
      key: "qualities",
      label: "品阶",
      options: [
        ...qualityNames.map((label, id) => ({ value: String(id), label })),
        ...(rows.some((row) => row.quality === null)
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
  ];
}
