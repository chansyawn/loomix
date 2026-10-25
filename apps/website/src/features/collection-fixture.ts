import { emptyCatalog } from "@loomix/content-schema";
import type { Catalog, RecordBase } from "@loomix/content-schema";
import type { CollectionRecord, CollectionView } from "./collection-view.ts";

export function catalogBase(record: CollectionRecord): RecordBase {
  return {
    id: record.id,
    name: record.name,
    image: record.image,
    description: record.description,
    quality: record.quality,
    encyclopediaEntry: { listed: true },
  };
}

export function catalogFixture(view: Partial<CollectionView> = {}): Catalog {
  const catalog = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  catalog.ingredientCategories = view.ingredientCategories ?? [];
  for (const record of view.furniture?.items ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "item",
      category: "furniture",
      subcategory: record.category,
      attributes: {
        type: record.type,
        size: record.size,
        colors: record.colors,
        materials: record.materials,
        sources: record.sources,
      },
    });
  for (const record of view.furniture?.sets ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "set",
      category: "furniture",
      memberIds: record.componentIds,
    });
  for (const record of view.creatures?.items ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "item",
      category: "creatures",
      subcategory: record.category,
      attributes: {
        region: record.region,
        habitat: record.habitat,
        activeSeasons: record.activeSeasons,
        activeTimes: record.activeTimes,
        activeWeather: record.activeWeather,
        sizeRange: record.sizeRange,
      },
    });
  for (const record of view.creatures?.series ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "series",
      category: "creatures",
      memberIds: record.creatureIds,
    });
  for (const record of view.plants?.items ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "item",
      category: "plants",
      subcategory: record.category,
      attributes: {
        originGalaxy: record.originGalaxy,
        maturityPeriod: record.maturityPeriod,
        harvestCount: record.harvestCount,
      },
    });
  for (const record of view.plants?.series ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "series",
      category: "plants",
      memberIds: record.plantIds,
    });
  for (const record of view.dishes?.items ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "item",
      category: "dishes",
      subcategory: null,
      attributes: {
        difficulty: record.difficulty,
        galaxyFlavor: record.galaxyFlavor,
        cookware: record.cookware,
        effects: record.effects,
      },
      recipe: record.recipe,
    });
  for (const record of view.dishes?.series ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "series",
      category: "dishes",
      memberIds: record.dishIds,
    });
  for (const record of view.clothing?.items ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "item",
      category: "clothing",
      subcategory: record.category,
      attributes: {
        colors: record.colors,
        materials: record.materials,
        styles: record.styles,
        sources: record.sources,
      },
    });
  for (const record of view.clothing?.sets ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "set",
      category: "clothing",
      memberIds: record.componentIds,
    });
  for (const record of view.clothing?.appearances ?? [])
    catalog.items.push({
      ...catalogBase(record),
      encyclopediaEntry: { listed: false },
      kind: "appearance",
      category: "clothing",
      subcategory: record.category,
    });
  for (const record of view.miscellaneous ?? [])
    catalog.items.push({
      ...catalogBase(record),
      kind: "item",
      category: "miscellaneous",
      subcategory: null,
      attributes: {},
    });
  return catalog;
}
