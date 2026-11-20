import { growthPlantIds, createRecordTagResolver } from "@loomix/schema/catalog";
import type { Catalog, ItemOf } from "@loomix/schema/catalog";
import { tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { acquisitionLabels } from "../collection/acquisition";
import { createImageResolver } from "@loomix/schema/assets";
import type { Assets } from "@loomix/schema/assets";
import type { IngredientItem } from "../collection-view";
import type { CreationCardReference } from "../collection/creation-card";
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
  cardsById: ReadonlyMap<number, CreationCardReference>,
): PlantsData {
  const image = createImageResolver(assets);
  const tagsFor = createRecordTagResolver(tagIndex);
  const seeds: PlantSeed[] = catalog.items
    .filter((item): item is ItemOf<"seed"> => item.kind === "seed")
    .map(({ kind: _kind, tagIds: _tagIds, growth, ...seed }) => ({
      ...seed,
      image: image(seed.image),
      plantIds: growthPlantIds(growth),
      growth: {
        ...growth,
        stages: growth.stages.map((stage) => ({ ...stage, image: image(stage.image) })),
      } as PlantGrowth,
    }));
  const seedsByPlant = new Map<number, PlantSeed[]>();
  for (const seed of seeds)
    for (const id of seed.plantIds) seedsByPlant.set(id, [...(seedsByPlant.get(id) ?? []), seed]);
  const records = new Map(
    catalog.items
      .filter((item): item is ItemOf<"plant"> => item.kind === "plant")
      .map((item) => [item.id, item]),
  );
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
      configurations.set(seed.id, {
        id: seed.id,
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
                  entries: item.treeDrops.map((drop) => {
                    const card = cardsById.get(drop.itemId);
                    const product = card ? itemRefs.get(card.productId) : undefined;
                    return {
                      ...drop,
                      item: itemRefs.get(drop.itemId) ?? null,
                      creationCard:
                        card && product && product.browsable !== false
                          ? { face: card.face, product: { id: product.id, name: product.name } }
                          : null,
                    };
                  }),
                },
              ]
            : [],
        ),
      },
    };
  };
  const items: PlantItem[] = [...records.values()].map((record) => {
    const related = seedsByPlant.get(record.id) ?? [];
    const harvestCounts = unique(
      related.flatMap((seed) =>
        seed.growth.kind === "crop" && seed.growth.harvestCount !== null
          ? [seed.growth.harvestCount]
          : [],
      ),
    );
    const item: Omit<PlantItem, "summary"> = {
      id: record.id,
      name: record.name,
      image: image(record.image),
      description: record.description,
      quality: record.quality,
      category: record.category,
      originGalaxy: tagsFor(record, "origins").map(tagLabel).join("，") || null,
      harvestCount: harvestCounts.length === 1 ? harvestCounts[0] : null,
      acquisition: itemAcquisitionLabels(record.id).join("，") || null,
      flowerColors: record.flowerColors,
      treeDrops: record.drops,
    };
    return { ...item, summary: summarize([item]) };
  });
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const series = catalog.collections
    .filter((group) => group.memberKind === "plant")
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
