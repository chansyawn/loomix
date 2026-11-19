import type { CatalogEntrySummary } from "../collection-view";
import type {
  DetailNavigationEntry,
  DetailNavigationGroup,
} from "../collection/detail-navigation-model";
import type { PlantItem, PlantSeed, PlantSeries, PlantsData } from "./model";

export type PlantDetailNavigationModel = Readonly<{
  groups: readonly DetailNavigationGroup[];
  hasUnconfirmedMembership: boolean;
}>;

function entry(record: CatalogEntrySummary, label?: string): DetailNavigationEntry {
  return { id: record.id, name: record.name, image: record.image, label };
}

function fruitDrops(tree: PlantItem) {
  return tree.treeDrops?.filter((drop) => drop.source === "fruit") ?? [];
}

function fruitEntries(tree: PlantItem, itemRefs: PlantsData["itemRefs"]) {
  return fruitDrops(tree).flatMap((drop) => {
    const fruit = itemRefs.get(drop.itemId);
    return fruit && fruit.browsable !== false ? [entry(fruit)] : [];
  });
}

function plantEntries(
  ids: readonly number[],
  items: ReadonlyMap<number, PlantItem>,
  itemRefs: PlantsData["itemRefs"],
) {
  const plants = ids.flatMap((id) => items.get(id) ?? []);
  return [
    ...plants.map((plant) => entry(plant)),
    ...plants.flatMap((plant) => fruitEntries(plant, itemRefs)),
  ];
}

function uniqueEntries(entries: DetailNavigationEntry[]) {
  return [...new Map(entries.map((item) => [item.id, item])).values()];
}

function seriesGroup(
  series: PlantSeries,
  data: PlantsData,
  items: ReadonlyMap<number, PlantItem>,
): DetailNavigationGroup {
  const memberIds = new Set(series.plantIds ?? []);
  return {
    key: `series-${series.id}`,
    label: series.name,
    entries: uniqueEntries([
      entry(series, "系列概览"),
      ...data.seeds
        .filter((seed) => seed.plantIds.some((id) => memberIds.has(id)))
        .map((seed) => entry(seed)),
      ...plantEntries(series.plantIds ?? [], items, data.itemRefs),
    ]),
  };
}

function growthGroup(
  seed: PlantSeed,
  items: ReadonlyMap<number, PlantItem>,
  itemRefs: PlantsData["itemRefs"],
): DetailNavigationGroup {
  return {
    key: `seed-${seed.id}`,
    label: seed.name,
    entries: uniqueEntries([entry(seed), ...plantEntries(seed.plantIds, items, itemRefs)]),
  };
}

function plantGroups(
  data: PlantsData,
  items: ReadonlyMap<number, PlantItem>,
  id: number,
  seed?: PlantSeed,
): DetailNavigationGroup[] {
  const plantIds = new Set(seed?.plantIds ?? [id]);
  const series = data.series.filter((group) => group.plantIds?.some((id) => plantIds.has(id)));
  const groups = series.map((group) => seriesGroup(group, data, items));

  if (seed) {
    const coveredIds = new Set(series.flatMap((group) => group.plantIds ?? []));
    if (seed.plantIds.some((id) => items.has(id) && !coveredIds.has(id)))
      groups.push(growthGroup(seed, items, data.itemRefs));
  } else if (series.length === 0) {
    for (const seed of data.seeds)
      if (seed.plantIds.includes(id)) groups.push(growthGroup(seed, items, data.itemRefs));

    const tree = items.get(id);
    if (tree && groups.length === 0) {
      const fruits = fruitEntries(tree, data.itemRefs);
      if (fruits.length > 0)
        groups.push({
          key: `tree-${tree.id}`,
          label: tree.name,
          entries: uniqueEntries([entry(tree), ...fruits]),
        });
    }
  }
  return groups;
}

export function plantDetailNavigation(
  data: PlantsData,
  currentId: number,
): PlantDetailNavigationModel {
  const items = new Map(data.items.map((item) => [item.id, item]));
  const currentSeed = data.seeds.find((seed) => seed.id === currentId);
  const currentSeries = data.series.find((series) => series.id === currentId);
  if (!items.has(currentId) && !currentSeed && !currentSeries)
    return { groups: [], hasUnconfirmedMembership: false };

  const groups = currentSeries
    ? [seriesGroup(currentSeries, data, items)]
    : plantGroups(data, items, currentId, currentSeed);
  const currentItem = data.itemRefs.get(currentId);
  if (items.has(currentId) && currentItem && currentItem.browsable !== false) {
    for (const tree of data.sourceTreesByItemId.get(currentId) ?? [])
      if (fruitDrops(tree).some((drop) => drop.itemId === currentId))
        groups.push(...plantGroups(data, items, tree.id));
  }

  return {
    groups: [...new Map(groups.map((group) => [group.key, group])).values()].filter((group) =>
      group.entries.some((item) => item.id !== currentId),
    ),
    hasUnconfirmedMembership:
      !currentSeries && data.series.some((group) => group.plantIds === null),
  };
}
