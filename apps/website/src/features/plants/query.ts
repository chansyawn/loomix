import { indexMembership } from "../omnidex/membership";
import type { PlantItem, PlantSeries } from "../omnidex-view.ts";
import type { PlantsData } from "./data";
import { seedSeries } from "./model";
import { missing, ungrouped } from "./search";
import type { FilterKey, View, ViewQuery } from "./search";
import type { FilterGroup as ListFilterGroup } from "@/features/omnidex/filter-panel";
import { qualityNames } from "@/features/omnidex/quality";
import { createNameMatcher } from "@/infrastructure/name-search";

export type Option = { value: string; label: string };
export type FilterGroup = ListFilterGroup<FilterKey>;

export function splitValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [missing];
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
        key: "harvestCounts",
        label: "收获茬数",
        options: options(
          data.seeds.map((seed) =>
            (seed.growth.kind === "crop" ? seed.growth.harvestCount : null) === null
              ? null
              : String(seed.growth.kind === "crop" ? seed.growth.harvestCount : null),
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
    : groups.filter((group) => ["qualities", "flowerColors"].includes(group.key));
}

function matches(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function queryPlants(data: PlantsData, view: View, query: ViewQuery) {
  const matchesName = createNameMatcher(query.q);
  const memberships = indexMembership(data.series, (group) => group.plantIds);
  if (view === "seeds") {
    const series = seedSeriesIndex(data);
    const seriesComplete = data.series.every((group) => group.plantIds !== null);
    const filtered = data.seeds.filter((seed) => {
      const membershipsForSeed = series.get(seed.id) ?? [];
      return (
        matchesName(seed.name) &&
        matches(query.harvestCounts, [
          (seed.growth.kind === "crop" ? seed.growth.harvestCount : null) === null
            ? missing
            : String(seed.growth.kind === "crop" ? seed.growth.harvestCount : null),
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
  const rows: (PlantItem | PlantSeries)[] = view === "items" ? data.items : data.series;
  const filtered = rows.filter((row) => {
    if (
      !matchesName(row.name) ||
      !matches(query.qualities, [row.quality === null ? missing : String(row.quality)]) ||
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
