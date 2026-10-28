import { CatalogSchema } from "@loomix/schema/catalog";
import type { Catalog, Growth, Item, Group } from "@loomix/schema/catalog";
import type { Dataset } from "@loomix/schema/dataset";
import type { CollectionObservations } from "../extraction/schema.ts";
import type { AssetRegistry } from "./assets.ts";
import type { ContentContext } from "../extraction/content/context.ts";
import { plainText, splitTags } from "../extraction/content/model.ts";
import { ingredientExpressionItemIds } from "../extraction/content/recipes.ts";

export function buildCatalog(
  observations: CollectionObservations,
  context: ContentContext,
  assets: AssetRegistry,
  identity: Dataset["context"],
): Catalog {
  const { tables, vocabulary } = context;
  const catalog: Catalog = {
    ...identity,
    kind: "catalog",
    items: [],
    groups: [],
    appearances: [],
    seeds: [],
    growths: [],
    ingredientCategories: observations.ingredientCategories.map((category) => ({
      ...category,
      itemIds: [...category.itemIds],
    })),
    entries: [],
  };
  const growths = new Map<number, Growth>();
  const addGrowth = (
    id: number,
    growth: CollectionObservations["details"][number]["growth"],
  ): number | null => {
    if (!growth) return null;
    const value = {
      id,
      ...growth,
      stages:
        growth.stages?.map((stage) => ({ ...stage, image: assets.image(stage.image) })) ?? null,
    };
    const previous = growths.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(value))
      throw new Error(`Conflicting growth configuration ${id}`);
    growths.set(id, value);
    return id;
  };
  const tags = (id: number, field: number): string[] | null => {
    const values = vocabulary
      .tags(context.main.get(id), field)
      .map((tag) => vocabulary.translateTag(tag));
    return values.length && values.every((value): value is string => value !== null)
      ? [...new Set(values)]
      : null;
  };
  const display = (id: number, field: number): string[] | null => {
    const values = splitTags(tables.string(context.ui.get(id), field)).map((key) =>
      vocabulary.renderDisplay(key),
    );
    return values.length && values.every((value): value is string => value !== null)
      ? [...new Set(values)]
      : null;
  };
  for (const record of observations.items) {
    const base = {
      id: record.id,
      name: record.name,
      description: record.description,
      quality: record.quality,
      image: assets.image(
        record.image,
        record.category === "furniture" && record.kind === "set" ? "banner" : "icon",
      ),
    };
    const kind =
      record.kind === "item" ? "item" : record.kind === "appearance" ? "appearance" : "group";
    catalog.entries.push({
      entity: { kind, id: record.id },
      encyclopedia: record.encyclopediaEntry,
    });
    if (record.kind === "appearance") {
      catalog.appearances.push({ ...base, subcategory: record.subcategory });
      continue;
    }
    if (record.kind !== "item") {
      catalog.groups.push({
        ...base,
        type: `${record.category}.${record.kind}` as Group["type"],
        memberIds: record.memberIds,
      });
      continue;
    }
    const detail = observations.details.find((entry) => entry.id === record.id);
    if (!detail) throw new Error(`Missing observed detail ${record.id}`);
    const sourceIds = tables.vector(context.ui.get(record.id), 2);
    const labels = sourceIds?.map((id) => plainText(tables.text(vocabulary.sources.get(id), 1)));
    const sources =
      labels?.length && labels.every((value): value is string => value !== null)
        ? [...new Set(labels)]
        : null;
    const common = {
      ...base,
      subcategory: record.subcategory,
      trade: detail.trade,
      acquisition: detail.acquisitionConditions,
    };
    switch (record.category) {
      case "furniture":
        catalog.items.push({
          ...common,
          type: "furniture",
          furnitureType: record.attributes.type,
          size: record.attributes.size,
          colors: tags(record.id, 9),
          materials: tags(record.id, 11),
          sources,
          craftingRecipes: record.craftingRecipes,
        });
        break;
      case "clothing":
        catalog.items.push({
          ...common,
          type: "clothing",
          colors: tags(record.id, 9),
          materials: tags(record.id, 11),
          styles: tags(record.id, 12),
          sources,
        });
        break;
      case "creatures":
        catalog.items.push({
          ...common,
          type: "creature",
          region: display(record.id, 31),
          habitat: display(record.id, 30),
          activeSeasons: display(record.id, 34),
          activeTimes: display(record.id, 32),
          activeWeather: display(record.id, 33),
          sizeRange: record.attributes.sizeRange,
          scientificName: record.attributes.scientificName,
          sources,
          research: record.research,
          size: detail.creatureSize,
          grades: detail.creatureGrades,
        });
        break;
      case "plants": {
        const crop = vocabulary.cropsByProduct.get(record.id);
        catalog.items.push({
          ...common,
          type: "plant",
          origins: tags(record.id, 8),
          maturityPeriod: record.attributes.maturityPeriod,
          harvestCount: record.attributes.harvestCount,
          sources,
          flowerColors: detail.flowerColors,
          growthId: addGrowth(crop ? tables.id(crop) : record.id, detail.growth),
          drops: detail.treeDrops,
          hybridRecipes: detail.hybridRecipes,
        });
        break;
      }
      case "dishes":
        catalog.items.push({
          ...common,
          type: "dish",
          difficulty: record.attributes.difficulty,
          galaxyFlavor: record.attributes.galaxyFlavor,
          cookware: record.attributes.cookware === null ? null : [record.attributes.cookware],
          effectsText: record.attributes.effects,
          tastes: record.attributes.tastes,
          sources,
          recipe: record.recipe,
          difficultyRequirement: record.difficultyRequirement,
          effects: detail.dishEffects,
        });
        break;
      case "miscellaneous":
        catalog.items.push({ ...common, type: "material", sources });
        break;
    }
  }
  for (const seed of observations.cropSeeds)
    catalog.seeds.push({
      id: seed.id,
      name: seed.name,
      image: assets.image(seed.image),
      description: seed.detail.description,
      quality: seed.detail.quality,
      productIds: seed.productIds,
      growthId: addGrowth(seed.id, seed.detail.growth),
      trade: seed.detail.trade,
      acquisition: seed.detail.acquisitionConditions,
    });
  catalog.growths = [...growths.values()].sort((a, b) => a.id - b.id);
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const references = new Set<number>();
  for (const association of context.ingredientCategoryBuild.associations)
    references.add(association.itemId);
  for (const category of catalog.ingredientCategories)
    category.itemIds = context.ingredientCategoryBuild.associations
      .filter((association) => association.categoryId === category.id)
      .map((association) => association.itemId)
      .sort((a, b) => a - b);
  const categories = new Map(
    catalog.ingredientCategories.map((category) => [category.id, category]),
  );
  for (const item of catalog.items) {
    if (item.type === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
    if (item.type === "furniture")
      for (const recipe of item.craftingRecipes ?? [])
        for (const material of recipe.materials ?? []) references.add(material.itemId);
    if (item.type === "dish")
      for (const slot of item.recipe?.slots ?? [])
        if (slot.expression !== null) {
          slot.itemIds = ingredientExpressionItemIds(slot.expression, categories);
          for (const id of slot.itemIds) references.add(id);
        }
  }
  for (const id of [...references].sort((a, b) => a - b)) {
    if (items.has(id)) continue;
    const row = context.main.get(id);
    const name = plainText(tables.text(row, 1));
    if (!row || !name) throw new Error(`Unresolved referenced item ${id}`);
    const item: Item = {
      id,
      type: "reference",
      name,
      description: null,
      quality: null,
      image: null,
    };
    catalog.items.push(item);
    items.set(id, item);
  }
  catalog.items.sort((a, b) => a.id - b.id);
  return CatalogSchema.parse(catalog);
}
