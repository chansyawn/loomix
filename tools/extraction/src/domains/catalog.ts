import assert from "node:assert/strict";
import { catalogAdmissionIds } from "../extraction/content/catalog-admissions.ts";
import { acquisition } from "../extraction/collection/details/client.ts";
import { CatalogSchema } from "@loomix/schema/catalog";
import type { Catalog, Group } from "@loomix/schema/catalog";
import type { Dataset } from "@loomix/schema/dataset";
import type { CollectionObservations } from "../extraction/schema.ts";
import type { AssetRegistry } from "./assets.ts";
import type { ContentContext } from "../extraction/content/context.ts";
import { plainText, splitTags } from "../extraction/content/model.ts";
import { ingredientExpressionItemIds } from "../extraction/content/recipes.ts";
import { readCraftingRecipes } from "../extraction/crafting/read.ts";
import { createRecordMetadata } from "./catalog-tags.ts";

export function buildCatalog(
  observations: CollectionObservations,
  context: ContentContext,
  assets: AssetRegistry,
  identity: Dataset["context"],
  referencedGiftItemIds: readonly number[] = [],
): Catalog {
  const { tables } = context;
  const { metadata, dictionary } = createRecordMetadata(context);
  const references = new Set<number>();
  const catalog: Catalog = {
    ...identity,
    kind: "catalog",
    records: [],
    references: [],
    gameplayTags: [],
    craftingRecipes: [],
    growths: [],
    ingredientCategories: observations.ingredientCategories.map((category) => ({
      ...category,
      itemIds: [...category.itemIds],
    })),
  };
  const display = (id: number, field: number): string[] | null => {
    const values = splitTags(tables.string(context.ui.get(id), field)).map((key) =>
      context.vocabulary.renderDisplay(key),
    );
    return values.length && values.every((value): value is string => value !== null)
      ? [...new Set(values)]
      : null;
  };
  for (const record of observations.items) {
    const base = {
      ...metadata(record.id),
      acquisition: acquisition(context, record.id).value,
      id: record.id,
      name: record.name,
      description: record.description,
      quality: record.quality,
      image: assets.image(
        record.image,
        record.category === "furniture" && record.kind === "set" ? "banner" : "icon",
      ),
    };
    if (record.kind === "appearance") {
      catalog.records.push({ ...base, type: "appearance", subcategory: record.subcategory });
      continue;
    }
    if (record.kind !== "item") {
      catalog.records.push({
        ...base,
        type: `${record.category}.${record.kind}` as Group["type"],
        memberIds: record.memberIds,
      });
      continue;
    }
    const detail = observations.details.find((entry) => entry.id === record.id);
    if (!detail) throw new Error(`Missing observed detail ${record.id}`);
    const common = {
      ...base,
      subcategory: record.subcategory,
      trade: detail.trade,
      acquisition: detail.acquisitionConditions,
    };
    switch (record.category) {
      case "furniture":
        catalog.records.push({
          ...common,
          type: "furniture",
          furnitureType: record.attributes.type,
        });
        break;
      case "clothing":
        catalog.records.push({
          ...common,
          type: "clothing",
        });
        break;
      case "creatures":
        catalog.records.push({
          ...common,
          type: "creature",
          region: display(record.id, 31),
          habitat: display(record.id, 30),
          activeSeasons: display(record.id, 34),
          activeTimes: display(record.id, 32),
          activeWeather: display(record.id, 33),
          sizeRange: record.attributes.sizeRange,
          scientificName: record.attributes.scientificName,
          size: detail.creatureSize,
          grades: detail.creatureGrades,
        });
        break;
      case "plants": {
        catalog.records.push({
          ...common,
          type: "plant",
          flowerColors: detail.flowerColors,
          drops: detail.treeDrops,
          hybridRecipes: detail.hybridRecipes,
        });
        break;
      }
      case "dishes":
        catalog.records.push({
          ...common,
          type: "dish",
          difficulty: record.attributes.difficulty,
          cookware: record.attributes.cookware === null ? null : [record.attributes.cookware],
          effectsText: record.attributes.effects,
          tastes: record.attributes.tastes,
          recipe: record.recipe,
          difficultyRequirement: record.difficultyRequirement,
          effects: detail.dishEffects,
        });
        break;
      case "miscellaneous":
        catalog.records.push({ ...common, type: "material" });
        break;
    }
  }
  for (const seed of observations.seeds) {
    if (catalog.records.some((record) => record.id === seed.id))
      throw new Error(`Seed classification conflict ${seed.id}`);
    catalog.records.push({
      ...seed,
      ...metadata(seed.id, true),
      type: "seed",
      image: assets.image(seed.image),
    });
  }
  catalog.growths = observations.growths.map((growth) => ({
    ...growth,
    stages: growth.stages.map((stage) => ({ ...stage, image: assets.image(stage.image) })),
  }));
  catalog.craftingRecipes = readCraftingRecipes(
    context,
    new Set(catalog.records.map((record) => record.id)),
  ).recipes;
  for (const recipe of catalog.craftingRecipes)
    for (const material of recipe.materials ?? []) references.add(material.itemId);
  const items = new Map(catalog.records.map((record) => [record.id, record]));
  for (const id of referencedGiftItemIds) references.add(id);
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
  for (const item of catalog.records) {
    if ("trade" in item)
      for (const offer of item.trade?.offers ?? [])
        if (offer.currencyItemId !== null) references.add(offer.currencyItemId);
    if (item.type === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
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
    catalog.references.push({ id, name });
  }
  catalog.records.sort((a, b) => a.id - b.id);
  catalog.gameplayTags = dictionary();
  assert.deepEqual(
    new Set(catalog.records.map((record) => record.id)),
    catalogAdmissionIds(context),
    "Exact catalog admission union",
  );
  return CatalogSchema.parse(catalog);
}
