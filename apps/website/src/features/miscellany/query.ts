import type { FilterGroup as CollectionFilterGroup } from "@/features/collection/filter-panel";
import { qualityNames } from "@/features/collection/quality";
import type { MiscellanyData } from "./data";
import { missing } from "./search";
import type { MiscellanyQuery } from "./search";

export type FilterGroup = CollectionFilterGroup<"qualities">;

export function filterGroups(data: MiscellanyData): FilterGroup[] {
  return [
    {
      key: "qualities",
      label: "品阶",
      options: qualityNames
        .map((label, value) => ({ value: String(value), label }))
        .concat(
          data.some((item) => item.quality === null) ? [{ value: missing, label: "未提供" }] : [],
        ),
    },
  ];
}

export function queryMiscellany(data: MiscellanyData, query: MiscellanyQuery) {
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows = data.filter((item) => {
    const matchesText =
      item.name.toLocaleLowerCase("zh-CN").includes(term) ||
      (item.description?.toLocaleLowerCase("zh-CN").includes(term) ?? false);
    const quality = item.quality === null ? missing : String(item.quality);
    return matchesText && (query.qualities.length === 0 || query.qualities.includes(quality));
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
