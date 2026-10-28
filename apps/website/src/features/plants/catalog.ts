import type { CatalogV5 } from "@loomix/content-schema/v5";
import type { IngredientItem } from "../collection-view";
import type { PlantItem, PlantSeed, PlantSummary, PlantsData } from "./model";

type PlantFacts = Omit<PlantItem, "summary">;

export function splitPlantValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function summarizePlants(
  items: PlantFacts[],
  seedsById: ReadonlyMap<number, PlantSeed>,
  itemRefs: ReadonlyMap<number, IngredientItem>,
): PlantSummary {
  const seeds = unique(
    items.flatMap((item) => (item.seedId === null ? [] : [item.seedId])),
  ).flatMap((id) => seedsById.get(id) ?? []);
  const growths = new Map(
    seeds.flatMap((seed) =>
      seed.detail.growth
        ? [[seed.id, { id: seed.id, name: seed.name, growth: seed.detail.growth }] as const]
        : [],
    ),
  );
  for (const item of items) {
    const id = item.seedId ?? item.id;
    if (item.growth && !growths.has(id))
      growths.set(id, { id, name: seedsById.get(id)?.name ?? item.name, growth: item.growth });
  }
  const dropIds = unique(items.flatMap((item) => item.treeDrops?.map((drop) => drop.itemId) ?? []));
  return {
    categories: unique(items.flatMap((item) => (item.category ? [item.category] : []))),
    galaxies: unique(items.flatMap((item) => splitPlantValues(item.originGalaxy))),
    sources: unique(items.flatMap((item) => splitPlantValues(item.sources))),
    flowerColors: unique(items.flatMap((item) => item.flowerColors ?? [])),
    harvestCounts: unique(
      items.flatMap((item) => (item.harvestCount === null ? [] : [item.harvestCount])),
    ),
    seeds,
    growths: [...growths.values()],
    drops: {
      items: dropIds.flatMap((id) => itemRefs.get(id) ?? []),
      unlistedCount: dropIds.filter((id) => !itemRefs.has(id)).length,
    },
  };
}

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
  catalog: CatalogV5,
  itemRefs: ReadonlyMap<number, IngredientItem>,
): PlantsData {
  const details = new Map(catalog.details.map((detail) => [detail.id, detail]));
  const seedsById = new Map(catalog.cropSeeds.map((seed) => [seed.id, seed]));
  const items: PlantItem[] = catalog.items.flatMap((record) => {
    if (record.category !== "plants" || record.kind !== "item") return [];
    const detail = details.get(record.id);
    const item: PlantFacts = {
      id: record.id,
      name: record.name,
      image: record.image,
      description: record.description,
      quality: record.quality,
      category: record.subcategory,
      ...record.attributes,
      sources:
        unique([
          ...splitPlantValues(record.attributes.sources),
          ...(detail?.acquisitionConditions?.flatMap((source) => splitPlantValues(source.label)) ??
            []),
        ]).join("，") || null,
      seedId: record.seedId,
      flowerColors: detail?.flowerColors ?? null,
      growth: detail?.growth ?? null,
      treeDrops: detail?.treeDrops ?? null,
    };
    return [{ ...item, summary: summarizePlants([item], seedsById, itemRefs) }];
  });
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const series = catalog.items.flatMap((record) => {
    if (record.category !== "plants" || record.kind !== "series") return [];
    const members = record.memberIds?.flatMap((id) => itemsById.get(id) ?? []) ?? [];
    return [
      {
        id: record.id,
        name: record.name,
        image: plantSeriesImage(record.name, members),
        description: record.description,
        quality: record.quality,
        seriesName: record.name,
        plantIds: record.memberIds,
        summary: summarizePlants(members, seedsById, itemRefs),
      },
    ];
  });
  const sourceTreesByItemId = new Map<number, PlantItem[]>();
  for (const tree of items) {
    for (const id of unique(tree.treeDrops?.map((drop) => drop.itemId) ?? [])) {
      sourceTreesByItemId.set(id, [...(sourceTreesByItemId.get(id) ?? []), tree]);
    }
  }
  return { items, series, itemRefs, sourceTreesByItemId };
}
