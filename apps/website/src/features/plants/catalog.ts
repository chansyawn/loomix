import { growthPlantIds, createRecordTagResolver, isGroupRecord } from "@loomix/schema/catalog";
import type { Catalog } from "@loomix/schema/catalog";
import { tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { acquisitionLabels } from "../collection/acquisition";
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
    members.flatMap((member) =>
      member.summary.growths.flatMap(({ growth }) =>
        growth.kind === "crop"
          ? growth.matureStages
              .filter(
                (stage) => stage.tag === "CROP_TAG_NORMAL" || stage.rank === "CROP_RANK_NORMAL",
              )
              .flatMap(
                (mature) =>
                  growth.stages.find((stage) => stage.id === mature.stageId)?.plantId ?? [],
              )
          : [],
      ),
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
  tagIndex: GameplayTagIndex,
): PlantsData {
  const image = createImageResolver(assets);
  const tagsFor = createRecordTagResolver(tagIndex);
  const growths = new Map<number, PlantGrowth>(
    catalog.growths.map((growth) => [
      growth.id,
      {
        ...growth,
        stages: growth.stages.map((stage) => ({ ...stage, image: image(stage.image) })),
      },
    ]),
  );
  const seeds: PlantSeed[] = catalog.records
    .filter((record) => record.type === "seed")
    .map((seed) => {
      const growth = growths.get(seed.growthId);
      if (!growth) throw new Error(`Missing seed growth ${seed.id}`);
      const plantIds = growthPlantIds(growth);
      const destinations = [
        ...new Set(plantIds.map((id) => itemRefs.get(id)?.cropSeriesId ?? null)),
      ];
      return {
        ...seed,
        plantIds,
        growth,
        image: image(seed.image),
        cropSeriesId: destinations.length === 1 ? destinations[0] : null,
      };
    });
  const seedsByPlant = new Map<number, PlantSeed[]>();
  for (const seed of seeds)
    for (const id of seed.plantIds) seedsByPlant.set(id, [...(seedsByPlant.get(id) ?? []), seed]);
  const records = new Map(
    catalog.records.filter((item) => item.type === "plant").map((item) => [item.id, item]),
  );
  const listed = new Set(catalog.records.map((record) => record.id));
  const itemAcquisitionLabels = (id: number): string[] =>
    acquisitionLabels(records.get(id)?.acquisition ?? null);
  const summarize = (items: Omit<PlantItem, "summary">[]): PlantSummary => {
    const ids = new Set(items.map((item) => item.id));
    const relatedSeeds = [
      ...new Map(
        [...ids].flatMap((id) => seedsByPlant.get(id) ?? []).map((seed) => [seed.id, seed]),
      ).values(),
    ];
    const configurations = new Map<number, { id: number; name: string; growth: PlantGrowth }>();
    for (const seed of relatedSeeds)
      configurations.set(seed.growthId, {
        id: seed.growthId,
        name: seed.name,
        growth: seed.growth,
      });
    return {
      categories: unique(items.flatMap((item) => (item.category ? [item.category] : []))),
      galaxies: unique(
        items.flatMap((item) =>
          records.has(item.id) ? tagsFor(records.get(item.id)!, "origins").map(tagLabel) : [],
        ),
      ),
      acquisition: unique(items.flatMap((item) => itemAcquisitionLabels(item.id))),
      flowerColors: unique(items.flatMap((item) => item.flowerColors ?? [])),
      harvestCounts: unique(
        [...configurations.values()].flatMap(({ growth }) =>
          growth.kind === "crop" && growth.harvestCount !== null ? [growth.harvestCount] : [],
        ),
      ),
      seeds: relatedSeeds,
      growths: [...configurations.values()],
      drops: {
        groups: items.flatMap((item) =>
          item.treeDrops?.length
            ? [
                {
                  treeId: item.id,
                  treeName: item.name,
                  entries: item.treeDrops.map((drop) => ({
                    ...drop,
                    item: itemRefs.get(drop.itemId) ?? null,
                  })),
                },
              ]
            : [],
        ),
      },
    };
  };
  const items: PlantItem[] = [...records.values()]
    .filter((record) => listed.has(record.id))
    .map((record) => {
      const related = seedsByPlant.get(record.id) ?? [];
      const harvestCounts = unique(
        related.flatMap((seed) =>
          seed.growth.kind === "crop" && seed.growth.harvestCount !== null
            ? [seed.growth.harvestCount]
            : [],
        ),
      );
      const days = unique(
        related.flatMap((seed) =>
          seed.growth.maturityDays === null ? [] : [seed.growth.maturityDays],
        ),
      );
      const item: Omit<PlantItem, "summary"> = {
        id: record.id,
        cropSeriesId: itemRefs.get(record.id)?.cropSeriesId ?? null,
        name: record.name,
        image: image(record.image),
        description: record.description,
        quality: record.quality,
        category: record.subcategory,
        originGalaxy: tagsFor(record, "origins").map(tagLabel).join("，") || null,
        maturityPeriod: days.length ? days.map((day) => `${day} 天`).join(" / ") : null,
        harvestCount: harvestCounts.length === 1 ? harvestCounts[0] : null,
        acquisition: itemAcquisitionLabels(record.id).join("，") || null,
        flowerColors: record.flowerColors,
        treeDrops: record.drops,
      };
      return { ...item, summary: summarize([item]) };
    });
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const series = catalog.records
    .filter(isGroupRecord)
    .filter((group) => group.type === "plants.series")
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
  return { items, series, seeds, itemRefs, sourceTreesByItemId };
}
