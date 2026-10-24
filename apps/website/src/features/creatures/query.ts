import type { CreatureItem, CreatureSeries } from "../collection-view.ts";
import type { FilterGroup } from "@/ui/collection/filter-panel";
import { qualityNames } from "@/ui/collection/quality";
import type { CreaturesData } from "./data";
import { categories, missing, ungrouped, seasons, times, weather } from "./search";
import type { FilterKey, View, ViewQuery } from "./search";

function splitValues(value: string | null): string[] {
  const values =
    value
      ?.split("，")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];
  return values.length > 0 ? values : [missing];
}
export function membershipIndex(series: CreatureSeries[]): Map<number, CreatureSeries[]> {
  const index = new Map<number, CreatureSeries[]>();
  for (const group of series)
    for (const id of group.creatureIds ?? []) index.set(id, [...(index.get(id) ?? []), group]);
  return index;
}
function options(values: (string | null)[]) {
  return [...new Set(values.map((value) => value || missing))]
    .sort((a, b) => (a === missing ? 1 : b === missing ? -1 : a.localeCompare(b, "zh-CN")))
    .map((value) => ({ value, label: value === missing ? "未提供" : value }));
}
export function filterGroups(data: CreaturesData): FilterGroup<FilterKey>[] {
  const withMissing = (values: string[], hasMissing: boolean) =>
    values
      .map((value) => ({ value, label: value }))
      .concat(hasMissing ? [{ value: missing, label: "未提供" }] : []);
  return [
    {
      key: "categories",
      label: "分类",
      options: withMissing(
        categories,
        data.items.some((row) => !row.category),
      ),
    },
    {
      key: "qualities",
      label: "品阶",
      options: qualityNames
        .map((label, value) => ({ value: String(value), label }))
        .concat(
          [...data.items, ...data.series].some((row) => row.quality === null)
            ? [{ value: missing, label: "未提供" }]
            : [],
        ),
    },
    {
      key: "regions",
      label: "地区",
      options: options(data.items.map((row) => row.region)),
      fullWidth: true,
    },
    { key: "habitats", label: "栖息地", options: options(data.items.map((row) => row.habitat)) },
    {
      key: "seasons",
      label: "出没季节",
      options: withMissing(
        seasons,
        data.items.some((row) => !row.activeSeasons),
      ),
    },
    {
      key: "times",
      label: "出没时段",
      options: withMissing(
        times,
        data.items.some((row) => !row.activeTimes),
      ),
    },
    {
      key: "weather",
      label: "出没天气",
      options: withMissing(
        weather,
        data.items.some((row) => !row.activeWeather),
      ),
    },
    {
      key: "series",
      label: "所属系列",
      options: data.series
        .map((group) => ({ value: String(group.id), label: group.name }))
        .concat([{ value: ungrouped, label: "未归入系列" }]),
      fullWidth: true,
    },
  ];
}
function matches(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}
function matchesCondition(selected: string[], raw: string | null, universal: string): boolean {
  const values = splitValues(raw);
  return (
    selected.length === 0 ||
    selected.some(
      (value) => values.includes(value) || (value !== missing && values.includes(universal)),
    )
  );
}
export function queryCreatures(data: CreaturesData, view: View, query: ViewQuery) {
  const memberships = membershipIndex(data.series);
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows: (CreatureItem | CreatureSeries)[] = view === "items" ? data.items : data.series;
  const filtered = rows.filter((row) => {
    if (
      !row.name.toLocaleLowerCase("zh-CN").includes(term) ||
      !matches(query.qualities, [row.quality === null ? missing : String(row.quality)])
    )
      return false;
    if (!("category" in row)) return true;
    return (
      matches(query.categories, [row.category || missing]) &&
      matches(query.regions, [row.region || missing]) &&
      matches(query.habitats, [row.habitat || missing]) &&
      matches(
        query.series,
        memberships.get(row.id)?.map((group) => String(group.id)) ?? [ungrouped],
      ) &&
      matchesCondition(query.seasons, row.activeSeasons, "全年") &&
      matchesCondition(query.times, row.activeTimes, "全天") &&
      matchesCondition(query.weather, row.activeWeather, "任意天气")
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
  return { rows: filtered, total: filtered.length };
}

export function seriesPreview(series: CreatureSeries, items: CreatureItem[]): CreatureItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return (series.creatureIds ?? [])
    .flatMap((id) => {
      const item = byId.get(id);
      return item?.image ? [item] : [];
    })
    .slice(0, 4);
}
