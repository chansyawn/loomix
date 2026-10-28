import type { Catalog } from "@loomix/schema/catalog";
import { createImageResolver } from "@loomix/schema/assets";
import type { Assets } from "@loomix/schema/assets";
import type { IngredientItem } from "../collection-view";
import type { PlantItem, PlantSeed, PlantSummary, PlantsData, PlantGrowth } from "./model";

export function splitPlantValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
}
const unique = <T>(values: T[]): T[] => [...new Set(values)];
export function plantSeriesImage(name: string, members: PlantItem[]): string | null {
  const normalIds = new Set(
    members.flatMap(
      (member) =>
        member.growth?.matureStages
          ?.filter((stage) => stage.tag === "CROP_TAG_NORMAL" || stage.rank === "CROP_RANK_NORMAL")
          .map((stage) => stage.productId) ?? [],
    ),
  );
  return (
    members.find((member) => normalIds.has(member.id) && member.image)?.image ??
    members.find((member) => member.name === name && member.image)?.image ??
    members.find((member) => member.image)?.image ??
    null
  );
}

export function buildPlantsData(
  catalog: Catalog,
  assets: Assets,
  itemRefs: ReadonlyMap<number, IngredientItem>,
): PlantsData {
  const image = createImageResolver(assets);
  const growths = new Map<number, PlantGrowth>(
    catalog.growths.map(({ id, stages, ...growth }) => [
      id,
      {
        ...growth,
        stages: stages?.map((stage) => ({ ...stage, image: image(stage.image) })) ?? null,
      },
    ]),
  );
  const seeds: PlantSeed[] = catalog.seeds.map((seed) => {
    const growth = seed.growthId === null ? null : (growths.get(seed.growthId) ?? null);
    return {
      ...seed,
      image: image(seed.image),
      detail: {
        description: seed.description,
        quality: seed.quality,
        trade: seed.trade,
        acquisitionConditions: seed.acquisition,
        growth,
        stageIds: growth?.stageIds ?? null,
        maturityDays: growth?.maturityDays ?? null,
        harvestCount: growth?.harvestCount ?? null,
      },
    };
  });
  const records = new Map(
    catalog.items.filter((item) => item.type === "plant").map((item) => [item.id, item]),
  );
  const listed = new Set(
    catalog.entries.filter((entry) => entry.entity.kind === "item").map((entry) => entry.entity.id),
  );
  const sourceLabels = (id: number): string[] => {
    const record = records.get(id);
    return unique([
      ...(record?.sources ?? []),
      ...(record?.acquisition?.map((source) => source.label) ?? []),
    ]);
  };
  const summarize = (items: Omit<PlantItem, "summary">[]): PlantSummary => {
    const ids = new Set(items.map((item) => item.id));
    const relatedSeeds = seeds.filter((seed) => seed.productIds.some((id) => ids.has(id)));
    const configurations = new Map<number, { id: number; name: string; growth: PlantGrowth }>();
    for (const seed of relatedSeeds)
      if (seed.detail.growth && seed.growthId !== null)
        configurations.set(seed.growthId, {
          id: seed.growthId,
          name: seed.name,
          growth: seed.detail.growth,
        });
    for (const item of items) {
      const growthId = records.get(item.id)?.growthId;
      if (item.growth && growthId != null && !configurations.has(growthId))
        configurations.set(growthId, { id: growthId, name: item.name, growth: item.growth });
    }
    const dropIds = unique(
      items.flatMap((item) => item.treeDrops?.map((drop) => drop.itemId) ?? []),
    );
    return {
      categories: unique(items.flatMap((item) => (item.category ? [item.category] : []))),
      galaxies: unique(items.flatMap((item) => records.get(item.id)?.origins ?? [])),
      sources: unique(items.flatMap((item) => sourceLabels(item.id))),
      flowerColors: unique(items.flatMap((item) => item.flowerColors ?? [])),
      harvestCounts: unique(
        items.flatMap((item) => (item.harvestCount === null ? [] : [item.harvestCount])),
      ),
      seeds: relatedSeeds,
      growths: [...configurations.values()],
      drops: {
        items: dropIds.flatMap((id) => itemRefs.get(id) ?? []),
        unlistedCount: dropIds.filter(
          (id) => !itemRefs.has(id) || itemRefs.get(id)?.listed === false,
        ).length,
      },
    };
  };
  const items: PlantItem[] = [...records.values()]
    .filter((record) => listed.has(record.id))
    .map((record) => {
      const seed = seeds.find((seed) => seed.productIds.includes(record.id));
      const item: Omit<PlantItem, "summary"> = {
        id: record.id,
        name: record.name,
        image: image(record.image),
        description: record.description,
        quality: record.quality,
        category: record.subcategory,
        originGalaxy: record.origins?.join("，") || null,
        maturityPeriod: record.maturityPeriod,
        harvestCount: record.harvestCount,
        sources: sourceLabels(record.id).join("，") || null,
        seedId: seed?.id ?? null,
        flowerColors: record.flowerColors,
        growth: record.growthId === null ? null : (growths.get(record.growthId) ?? null),
        treeDrops: record.drops,
      };
      return { ...item, summary: summarize([item]) };
    });
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const listedGroups = new Set(
    catalog.entries
      .filter((entry) => entry.entity.kind === "group")
      .map((entry) => entry.entity.id),
  );
  const series = catalog.groups
    .filter((group) => group.type === "plants.series" && listedGroups.has(group.id))
    .map((group) => {
      const members = group.memberIds?.flatMap((id) => itemsById.get(id) ?? []) ?? [];
      return {
        id: group.id,
        name: group.name,
        image: image(group.image) ?? plantSeriesImage(group.name, members),
        description: group.description,
        quality: group.quality,
        seriesName: group.name,
        plantIds: group.memberIds,
        summary: summarize(members),
      };
    });
  const sourceTreesByItemId = new Map<number, PlantItem[]>();
  for (const tree of items)
    for (const id of unique(tree.treeDrops?.map((drop) => drop.itemId) ?? []))
      sourceTreesByItemId.set(id, [...(sourceTreesByItemId.get(id) ?? []), tree]);
  return { items, series, itemRefs, sourceTreesByItemId };
}
