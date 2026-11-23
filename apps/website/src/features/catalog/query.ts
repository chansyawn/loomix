import { createNameMatcher } from "@/infrastructure/name-search";
import type { FilterGroup } from "../omnidex/filter-types";
import { qualityNames } from "../omnidex/quality";
import type { CatalogQuery, FilterKey } from "./search";
import { categoryNames, type OmnidexCatalog } from "../omnidex/catalog";

function allRecords(data: OmnidexCatalog) {
  return data.rows.filter((row) => !("memberKind" in row.record));
}

const intersects = (selected: string[], values: string[]) =>
  !selected.length || values.some((value) => selected.includes(value));
export function queryCatalog(data: OmnidexCatalog, query: CatalogQuery) {
  const matchesName = createNameMatcher(query.q);
  const rows = allRecords(data).filter(
    (row) =>
      matchesName(row.name) &&
      intersects(query.categories, [row.category]) &&
      intersects(query.qualities, [row.quality === null ? "__missing" : String(row.quality)]) &&
      data.tags.matches(row.id, query.tags, query.tagMode) &&
      intersects(
        query.acquisition,
        row.acquisition?.map((source) => String(source.sourceId)) ?? [],
      ),
  );
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
export function filterGroups(
  data: OmnidexCatalog,
  selectedTags: string[] = [],
): FilterGroup<FilterKey>[] {
  const rows = allRecords(data);
  const options = (values: Record<string, string>) =>
    Object.entries(values).map(([value, label]) => ({ value, label }));
  const sources = new Map(
    rows
      .flatMap((row) => row.acquisition ?? [])
      .map((source) => [String(source.sourceId), source.label]),
  );
  return [
    {
      key: "tags",
      label: "标签",
      tree: true,
      selectionMode: "independent",
      description: "每个标签包含自身及子级；可选择同时满足全部标签，或满足任一标签。",
      options: data.tags.options(selectedTags),
    },
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
    {
      key: "acquisition",
      label: "获取来源",
      options: [...sources].map(([value, label]) => ({ value, label })),
    },
  ];
}
