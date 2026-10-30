import type { PlantItem, PlantSeries } from "../collection-view.ts";
import type { PlantsData } from "./data";
import type { PlantSeed } from "./model";
import { missing, ungrouped } from "./search";
import type { FilterKey, View, ViewQuery } from "./search";
import type { FilterGroup as CollectionFilterGroup } from "@/features/collection/filter-panel";
import { qualityNames } from "@/features/collection/quality";

export type Option = { value: string; label: string };
export type FilterGroup = CollectionFilterGroup<FilterKey>;

export function splitValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [missing];
}

export function membershipIndex(series: PlantSeries[]): Map<number, PlantSeries[]> {
  const index = new Map<number, PlantSeries[]>();
  for (const group of series)
    for (const id of group.plantIds ?? []) index.set(id, [...(index.get(id) ?? []), group]);
  return index;
}

export function seedSourceLabels(seed: PlantSeed): string[] {
  return [
    ...new Set(
      seed.detail.acquisitionConditions?.map((source) =>
        source.condition ? `${source.label}（${source.condition}）` : source.label,
      ) ?? [],
    ),
  ];
}

export function seedSeries(seed: PlantSeed, groups: PlantSeries[]): PlantSeries[] {
  const productIds = new Set(seed.productIds);
  return groups.filter((group) => group.plantIds?.some((id) => productIds.has(id)));
}

export function seedSeriesIndex(data: PlantsData): Map<number, PlantSeries[]> {
  return new Map(data.seeds.map((seed) => [seed.id, seedSeries(seed, data.series)]));
}

function options(values: (string | null)[]): Option[] {
  return [...new Set(values.map((value) => (value ? value : missing)))]
    .sort((a, b) => (a === missing ? 1 : b === missing ? -1 : a.localeCompare(b, "zh-CN")))
    .map((value) => ({ value, label: value === missing ? "未提供" : value }));
}

export function filterGroups(data: PlantsData, view: View = "items"): FilterGroup[] {
  if (view === "seeds") {
    const series = seedSeriesIndex(data);
    const usedSeriesIds = new Set(
      [...series.values()].flatMap((groups) => groups.map((group) => group.id)),
    );
    const complete = data.series.every((group) => group.plantIds !== null);
    return [
      {
        key: "sources",
        label: "获取来源",
        options: options(data.seeds.flatMap(seedSourceLabels)),
        fullWidth: true,
      },
      {
        key: "harvestCounts",
        label: "收获茬数",
        options: options(
          data.seeds.map((seed) =>
            seed.detail.harvestCount === null ? null : String(seed.detail.harvestCount),
          ),
        ),
      },
      {
        key: "series",
        label: "所属系列",
        options: data.series
          .filter((group) => usedSeriesIds.has(group.id))
          .map((group) => ({ value: String(group.id), label: group.name }))
          .concat(complete ? [{ value: ungrouped, label: "未归入系列" }] : []),
        fullWidth: true,
      },
    ];
  }
  const groups: FilterGroup[] = [
    {
      key: "sources",
      label: "获取来源",
      options: options(data.items.flatMap((row) => splitValues(row.sources))),
      fullWidth: true,
    },
    {
      key: "flowerColors",
      label: "花色",
      options: options(
        data.items.flatMap((row) => (row.flowerColors?.length ? row.flowerColors : [null])),
      ),
    },
    { key: "categories", label: "分类", options: options(data.items.map((row) => row.category)) },
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
      key: "galaxies",
      label: "原产星系",
      options: options(data.items.flatMap((row) => splitValues(row.originGalaxy))),
      fullWidth: true,
    },
    {
      key: "series",
      label: "所属系列",
      options: data.series
        .filter((group) => group.plantIds !== null)
        .map((group) => ({ value: String(group.id), label: group.name }))
        .concat(
          data.series.every((group) => group.plantIds !== null)
            ? [{ value: ungrouped, label: "未归入系列" }]
            : [],
        ),
      fullWidth: true,
    },
    {
      key: "harvestCounts",
      label: "收获茬数",
      options: options(
        data.items.map((row) => (row.harvestCount === null ? null : String(row.harvestCount))),
      ),
    },
  ];
  return view === "items"
    ? groups
    : groups.filter((group) => ["qualities", "sources", "flowerColors"].includes(group.key));
}

function matches(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function queryPlants(data: PlantsData, view: View, query: ViewQuery) {
  const memberships = membershipIndex(data.series);
  if (view === "seeds") {
    const series = seedSeriesIndex(data);
    const seriesComplete = data.series.every((group) => group.plantIds !== null);
    const term = query.q.trim().toLocaleLowerCase("zh-CN");
    const filtered = data.seeds.filter((seed) => {
      const sources = seedSourceLabels(seed);
      const membershipsForSeed = series.get(seed.id) ?? [];
      return (
        seed.name.toLocaleLowerCase("zh-CN").includes(term) &&
        matches(query.sources, sources.length > 0 ? sources : [missing]) &&
        matches(query.harvestCounts, [
          seed.detail.harvestCount === null ? missing : String(seed.detail.harvestCount),
        ]) &&
        matches(
          query.series,
          membershipsForSeed.length > 0
            ? membershipsForSeed.map((group) => String(group.id))
            : seriesComplete
              ? [ungrouped]
              : [],
        )
      );
    });
    if (query.sort !== "original")
      filtered.sort((a, b) => {
        const direction = query.sort.endsWith("desc") ? -1 : 1;
        return direction * a.name.localeCompare(b.name, "zh-CN");
      });
    return { rows: filtered, total: filtered.length, memberships };
  }
  const membershipDataComplete = data.series.every((group) => group.plantIds !== null);
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const rows: (PlantItem | PlantSeries)[] = view === "items" ? data.items : data.series;
  const filtered = rows.filter((row) => {
    if (
      !row.name.toLocaleLowerCase("zh-CN").includes(term) ||
      !matches(query.qualities, [row.quality === null ? missing : String(row.quality)]) ||
      !matches(query.sources, row.summary.sources.length ? row.summary.sources : [missing]) ||
      !matches(
        query.flowerColors,
        row.summary.flowerColors.length ? row.summary.flowerColors : [missing],
      )
    )
      return false;
    if (!("category" in row)) return true;
    return (
      matches(query.categories, [row.category || missing]) &&
      matches(query.galaxies, splitValues(row.originGalaxy)) &&
      matches(
        query.series,
        memberships.get(row.id)?.map((group) => String(group.id)) ??
          (membershipDataComplete ? [ungrouped] : []),
      ) &&
      matches(query.harvestCounts, [row.harvestCount === null ? missing : String(row.harvestCount)])
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
  return { rows: filtered, total: filtered.length, memberships };
}
