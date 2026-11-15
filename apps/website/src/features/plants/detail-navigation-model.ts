import type { CollectionRecord } from "../collection-view";
import type { PlantItem, PlantSeed, PlantSeries, PlantsData } from "./model";

type NavigationKind = "item" | "seed" | "series";
export type PlantNavigationEntry = Readonly<
  Pick<CollectionRecord, "id" | "name" | "image"> & { kind: NavigationKind }
>;
export type PlantNavigationGroup = Readonly<{
  key: string;
  label: string;
  entries: readonly PlantNavigationEntry[];
}>;
export type PlantDetailNavigationModel = Readonly<{
  groups: readonly PlantNavigationGroup[];
  hasUnconfirmedMembership: boolean;
}>;

function entry(record: CollectionRecord, kind: NavigationKind): PlantNavigationEntry {
  return { id: record.id, name: record.name, image: record.image, kind };
}

function plantEntries(ids: readonly number[], items: ReadonlyMap<number, PlantItem>) {
  return ids.flatMap((id) => {
    const plant = items.get(id);
    return plant ? [entry(plant, "item")] : [];
  });
}

function uniqueEntries(entries: PlantNavigationEntry[]) {
  return [...new Map(entries.map((item) => [item.id, item])).values()];
}

function seriesGroup(
  series: PlantSeries,
  seeds: readonly PlantSeed[],
  items: ReadonlyMap<number, PlantItem>,
): PlantNavigationGroup {
  const memberIds = new Set(series.plantIds ?? []);
  return {
    key: `series-${series.id}`,
    label: series.name,
    entries: uniqueEntries([
      entry(series, "series"),
      ...seeds
        .filter((seed) => seed.plantIds.some((id) => memberIds.has(id)))
        .map((seed) => entry(seed, "seed")),
      ...plantEntries(series.plantIds ?? [], items),
    ]),
  };
}

function growthGroup(seed: PlantSeed, items: ReadonlyMap<number, PlantItem>): PlantNavigationGroup {
  return {
    key: `seed-${seed.id}`,
    label: seed.name,
    entries: uniqueEntries([entry(seed, "seed"), ...plantEntries(seed.plantIds, items)]),
  };
}

export function plantDetailNavigation(
  data: Pick<PlantsData, "items" | "seeds" | "series">,
  currentId: number,
): PlantDetailNavigationModel {
  const items = new Map(data.items.map((item) => [item.id, item]));
  const currentSeed = data.seeds.find((seed) => seed.id === currentId);
  const currentSeries = data.series.find((series) => series.id === currentId);
  if (!items.has(currentId) && !currentSeed && !currentSeries)
    return { groups: [], hasUnconfirmedMembership: false };

  const plantIds = new Set(currentSeed?.plantIds ?? [currentId]);
  const series = currentSeries
    ? [currentSeries]
    : data.series.filter((group) => group.plantIds?.some((id) => plantIds.has(id)));
  const groups = series.map((group) => seriesGroup(group, data.seeds, items));

  if (currentSeed) {
    const coveredIds = new Set(series.flatMap((group) => group.plantIds ?? []));
    if (currentSeed.plantIds.some((id) => items.has(id) && !coveredIds.has(id)))
      groups.push(growthGroup(currentSeed, items));
  } else if (!currentSeries && series.length === 0) {
    for (const seed of data.seeds)
      if (seed.plantIds.includes(currentId)) groups.push(growthGroup(seed, items));
  }

  return {
    groups: groups.filter((group) => group.entries.some((item) => item.id !== currentId)),
    hasUnconfirmedMembership:
      !currentSeries && data.series.some((group) => group.plantIds === null),
  };
}
