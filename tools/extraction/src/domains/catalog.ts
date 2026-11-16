import assert from "node:assert/strict";
import { CatalogSchema } from "@loomix/schema/catalog";
import type {
  Acquisition,
  Catalog,
  Collection,
  CollectionMemberKind,
  Growth,
  Item,
  ItemOf,
  RecipeSlot,
} from "@loomix/schema/catalog";
import { catalogAdmissionIds } from "../extraction/content/catalog-admissions.ts";
import { acquisition } from "../extraction/collection/details/client.ts";
import type { CollectionObservations } from "../extraction/schema.ts";
import type { AssetRegistry } from "./assets.ts";
import type { ContentContext } from "../extraction/content/context.ts";
import { plainText, splitTags } from "../extraction/content/model.ts";
import { ingredientExpressionItemIds } from "../extraction/content/recipes.ts";
import { readCraftingRecipes } from "../extraction/crafting/read.ts";
import { readCatalogMetadata } from "../source/client/catalog-metadata.ts";
import type { NeighborOutfit } from "../extraction/neighbors/types.ts";
import type { ObservedAcquisition, ObservedRecipeSlot } from "../extraction/schemas/observed.ts";
import { profile } from "../profile.ts";

type ObservedItem = CollectionObservations["items"][number];
type ObservedGrowth = CollectionObservations["growths"][number];

const memberKinds: Record<string, CollectionMemberKind> = {
  furniture: "furniture",
  clothing: "clothing",
  creatures: "creature",
  plants: "plant",
  dishes: "dish",
};

const toAcquisition = (values: readonly ObservedAcquisition[] | null): Acquisition[] | null =>
  values?.map(({ sourceId, label }) => ({ sourceId, label })) ?? null;

// 观察层尺寸已规范为“宽x深”，发布层只保留数值。
function furnitureSize(value: string | null): ItemOf<"furniture">["size"] {
  if (value === null) return null;
  const [width, depth] = value.split("x").map(Number);
  if (!width || !depth) throw new Error(`Invalid furniture size ${value}`);
  return { width, depth };
}

function toGrowth(growth: ObservedGrowth, assets: AssetRegistry): Growth {
  const stages = growth.stages.map((stage) => ({ ...stage, image: assets.image(stage.image) }));
  if (growth.kind === "staged") return { kind: "staged", stages };
  return {
    kind: "crop",
    stages,
    initialStageIds: growth.initialStageIds,
    regrowthStageIds: growth.regrowthStageIds ?? [],
    matureStages: growth.matureStages,
    witheredStageId: growth.witheredStageId,
    harvestCount: growth.harvestCount,
  };
}

// 表达式无法解析的槽位不得以部分结果发布，直接中止以便修正解析规则。
function toSlots(
  productId: number,
  slots: readonly ObservedRecipeSlot[] | null,
  categories: ReadonlyMap<number, { itemIds: number[] }>,
): RecipeSlot[] {
  return (slots ?? []).map((slot) => {
    if (slot.expression === null)
      throw new Error(`Unresolved ingredient expression ${productId}: ${slot.rawExpression}`);
    return {
      expression: slot.expression,
      itemIds: ingredientExpressionItemIds(slot.expression, categories),
    };
  });
}

export function buildCatalog({
  observations,
  context,
  assets,
  referencedItemIds = [],
  neighborOutfits = [],
  neighborImage,
}: {
  observations: CollectionObservations;
  context: ContentContext;
  assets: AssetRegistry;
  referencedItemIds?: readonly number[];
  neighborOutfits?: readonly NeighborOutfit[];
  neighborImage: (reference: string) => ReturnType<AssetRegistry["image"]>;
}): Catalog {
  const { tables } = context;
  const metadata = readCatalogMetadata(tables, context.gameplayTags.index);
  const tagIds = (id: number) => metadata.record(id).value.tagIds;
  const items: Item[] = [];
  const collections: Collection[] = [];
  const details = new Map(observations.details.map((detail) => [detail.id, detail]));
  const categories = new Map<number, { itemIds: number[] }>();
  for (const { categoryId, itemId } of context.ingredientCategoryBuild.associations) {
    const entry = categories.get(categoryId) ?? { itemIds: [] };
    entry.itemIds.push(itemId);
    categories.set(categoryId, entry);
  }
  for (const entry of categories.values())
    entry.itemIds = [...new Set(entry.itemIds)].sort((a, b) => a - b);
  const cooking = new Map(observations.cookingRecipes.map((recipe) => [recipe.productId, recipe]));
  const crafting = new Map<number, ItemOf<"furniture">["craftingRecipes"]>();
  const admitted = catalogAdmissionIds(
    context,
    neighborOutfits.map((outfit) => outfit.id),
  );
  for (const { productId, id, materials } of readCraftingRecipes(context, admitted).recipes)
    crafting.set(productId, [...(crafting.get(productId) ?? []), { id, materials }]);
  const display = (id: number, field: number): string[] | null => {
    const values = splitTags(tables.string(context.ui.get(id), field)).map((key) =>
      context.vocabulary.renderDisplay(key),
    );
    return values.length && values.every((value): value is string => value !== null)
      ? [...new Set(values)]
      : null;
  };

  const toItem = (record: ObservedItem): Item | Collection => {
    const base = {
      id: record.id,
      name: record.name,
      description: record.description,
      quality: record.quality,
    };
    if (record.kind === "set" || record.kind === "series")
      return {
        ...base,
        image: assets.image(record.image, record.category === "furniture" ? "banner" : "icon"),
        acquisition: toAcquisition(acquisition(context, record.id).value),
        memberKind: memberKinds[record.category]!,
        memberIds: record.memberIds,
      };
    const listed = { ...base, image: assets.image(record.image), tagIds: tagIds(record.id) };
    if (record.kind === "appearance")
      return {
        ...listed,
        kind: "appearance",
        category: record.subcategory,
        acquisition: toAcquisition(acquisition(context, record.id).value),
      };
    const detail = details.get(record.id);
    if (!detail) throw new Error(`Missing observed detail ${record.id}`);
    const item = { ...listed, acquisition: toAcquisition(detail.acquisitionConditions) };
    const category = record.subcategory;
    switch (record.category) {
      case "furniture":
        return {
          ...item,
          kind: "furniture",
          category,
          furnitureCategory: record.attributes.type,
          size: furnitureSize(record.attributes.size),
          craftingRecipes: crafting.get(record.id) ?? [],
        };
      case "clothing":
        return { ...item, kind: "clothing", category };
      case "creatures":
        return {
          ...item,
          kind: "creature",
          category,
          scientificName: record.attributes.scientificName,
          region: display(record.id, profile.fields.ui.region),
          habitat: display(record.id, profile.fields.ui.habitat),
          activeSeasons: display(record.id, profile.fields.ui.seasons),
          activeTimes: display(record.id, profile.fields.ui.times),
          activeWeather: display(record.id, profile.fields.ui.weather),
          size:
            detail.creatureSize &&
            detail.creatureSize.min !== null &&
            detail.creatureSize.max !== null &&
            detail.creatureSize.unit !== null
              ? {
                  min: detail.creatureSize.min,
                  max: detail.creatureSize.max,
                  unit: detail.creatureSize.unit,
                }
              : null,
        };
      case "plants":
        return {
          ...item,
          kind: "plant",
          category,
          flowerColors: detail.flowerColors,
          drops:
            detail.treeDrops?.map(({ itemId, dropGroupId }) => ({
              itemId,
              source: dropGroupId === null ? ("fruit" as const) : ("felling" as const),
            })) ?? null,
        };
      case "dishes": {
        const recipe = cooking.get(record.id);
        return {
          ...item,
          kind: "dish",
          // 力气值与观察层效果文本同源，文本未确认时不单独发布数值。
          strength:
            record.attributes.effects === null ? null : tables.uint(context.ui.get(record.id), 8),
          effects: detail.dishEffects,
          cooking: recipe
            ? {
                difficulty: recipe.difficulty,
                unlockCondition: recipe.unlockCondition,
                cookware: recipe.cookware,
                tastes: recipe.tastes,
                slots: toSlots(record.id, recipe.slots, categories),
              }
            : null,
        };
      }
      case "miscellaneous":
        return { ...item, kind: "material" };
    }
  };
  for (const record of observations.items) {
    const entry = toItem(record);
    if ("memberKind" in entry) collections.push(entry);
    else items.push(entry);
  }
  const growths = new Map(observations.growths.map((growth) => [growth.id, growth]));
  for (const seed of observations.seeds) {
    const growth = growths.get(seed.growthId);
    if (!growth) throw new Error(`Missing seed growth ${seed.id}`);
    items.push({
      id: seed.id,
      kind: "seed",
      name: seed.name,
      description: seed.description,
      quality: seed.quality,
      image: assets.image(seed.image),
      acquisition: toAcquisition(seed.acquisition),
      tagIds: tagIds(seed.id),
      growth: toGrowth(growth, assets),
    });
  }
  for (const outfit of neighborOutfits) {
    const qualities = tables
      .rows(profile.roots.ui)
      .filter((row) => tables.id(row) === outfit.id)
      .map((row) => tables.uint(row, profile.fields.ui.quality, 0));
    if (new Set(qualities).size > 1)
      throw new Error(`Conflicting neighbor clothing qualities ${outfit.id}`);
    const prices = new Set(outfit.offers.map((offer) => offer.configuredPrice));
    if (prices.size > 1) throw new Error(`Conflicting neighbor clothing prices ${outfit.id}`);
    const image = neighborImage(outfit.imagePath);
    if (!image) throw new Error(`Missing neighbor clothing image ${outfit.id}`);
    items.push({
      id: outfit.id,
      kind: "neighborClothing",
      name: outfit.nameZh,
      description: outfit.descriptionZh,
      quality: qualities[0] ?? 0,
      image,
      acquisition: toAcquisition(acquisition(context, outfit.id).value),
      tagIds: tagIds(outfit.id),
      category: outfit.slotNameZh,
      neighborId: outfit.neighborId,
      playerItemId:
        outfit.playerItemId !== null && context.main.has(outfit.playerItemId)
          ? outfit.playerItemId
          : null,
      bodyTypes: outfit.bodyTypes,
      price: [...prices][0] ?? null,
    });
  }
  const formal = new Set([...items, ...collections].map((entry) => entry.id));
  if (formal.size !== items.length + collections.length)
    throw new Error("Catalog classification conflict");
  assert.deepEqual(formal, admitted, "Exact catalog admission union");
  verifyIngredientMemberships(context, items);
  const references = new Set<number>([
    ...referencedItemIds,
    ...context.ingredientCategoryBuild.associations.map((association) => association.itemId),
  ]);
  for (const item of items) {
    if (item.kind === "furniture")
      for (const recipe of item.craftingRecipes)
        for (const material of recipe.materials ?? []) references.add(material.itemId);
    if (item.kind === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
    if (item.kind === "neighborClothing" && item.playerItemId !== null)
      references.add(item.playerItemId);
  }
  for (const id of [...references].sort((a, b) => a - b)) {
    if (formal.has(id)) continue;
    const name = plainText(tables.text(context.main.get(id), 1));
    if (!name) throw new Error(`Unresolved referenced item ${id}`);
    const descriptions = new Set(
      tables
        .rows(profile.roots.ui)
        .filter((row) => tables.id(row) === id)
        .map((row) => plainText(tables.text(row, profile.fields.ui.description))),
    );
    if (descriptions.size > 1) throw new Error(`Conflicting referenced item details ${id}`);
    items.push({ id, kind: "reference", name, description: [...descriptions][0] ?? null });
  }
  items.sort((a, b) => a.id - b.id);
  collections.sort((a, b) => a.id - b.id);
  return CatalogSchema.parse({ items, collections });
}

function verifyIngredientMemberships(context: ContentContext, items: readonly Item[]): void {
  const index = context.vocabulary.tagIndex;
  const root = index.findByName("食材");
  if (!root) return;
  const ingredientIds = new Set(index.subtree(root.id).map((tag) => tag.id));
  const expected = new Map<number, Set<number>>();
  for (const association of context.ingredientCategoryBuild.associations) {
    if (!association.listed) continue;
    const memberships = expected.get(association.itemId) ?? new Set<number>();
    memberships.add(association.categoryId);
    expected.set(association.itemId, memberships);
  }
  for (const item of items) {
    if (item.kind === "reference") continue;
    const actual = new Set<number>();
    for (const tagId of item.tagIds)
      for (const ancestor of index.ancestors(tagId))
        if (ingredientIds.has(ancestor.id)) actual.add(ancestor.id);
    assert.deepEqual(
      actual,
      expected.get(item.id) ?? new Set<number>(),
      `Ingredient tag membership mismatch for ${item.id}`,
    );
  }
}
