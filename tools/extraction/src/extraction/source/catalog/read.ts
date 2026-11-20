import assert from "node:assert/strict";
import type { CatalogObservation, WithImageUses, ImageUse, SourceProof } from "../../model.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import { readOutfits } from "./outfits.ts";
import { readReferences } from "./references.ts";
import { localizedSources, tableSource } from "./collection/evidence.ts";
import type {
  Acquisition,
  Collection,
  CollectionMemberKind,
  Growth,
  Item,
  ItemOf,
  RecipeSlot,
} from "@loomix/schema/catalog";
import { catalogAdmissionIds } from "./catalog-admissions.ts";
import { acquisition } from "./collection/details/client.ts";
import type { CollectionObservations } from "../../schema.ts";
import type { ContentContext } from "./context.ts";
import { splitTags } from "./model.ts";
import { ingredientExpressionItemIds } from "./recipes.ts";
import type { readCraftingRecipes } from "./crafting/read.ts";
import { readCreationCards } from "./crafting/cards.ts";
import type { imageCollector } from "../images.ts";
import { readCatalogMetadata } from "./metadata/read.ts";
import type { NeighborOutfit } from "../neighbors/types.ts";
import type { ObservedAcquisition, ObservedRecipeSlot } from "../../schemas/observed.ts";
import { profile } from "../../../profile.ts";

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

function toGrowth(
  growth: ObservedGrowth,
  assets: { image: (use: string | null) => ImageUse | null },
): WithImageUses<Growth> {
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

export function readCatalog({
  observations,
  context,
  crafting,
  images,
  referencedItemIds = [],
  neighborOutfits = [],
  neighborImage,
  outfitSourcesById,
}: {
  observations: CollectionObservations;
  context: ContentContext;
  crafting: ReturnType<typeof readCraftingRecipes>;
  images: ReturnType<typeof imageCollector>;
  referencedItemIds?: readonly number[];
  neighborOutfits?: readonly NeighborOutfit[];
  neighborImage: (reference: string, id: number) => ImageUse | null;
  outfitSourcesById: ReadonlyMap<number, EvidenceSource[]>;
}) {
  const { tables } = context;
  const proofs: SourceProof[] = [];
  const source = (rows: ReturnType<typeof localizedSources>): EvidenceSource[] =>
    rows.map(({ file, table, rowOffset, fields }) => ({
      kind: "table",
      file,
      table,
      rowOffset,
      fields,
    }));
  const proof = (
    id: number,
    fieldPath: string,
    value: unknown,
    sources: EvidenceSource[],
    reason = "configuration_missing",
    owner: SourceProof["owner"] = "item",
  ) => {
    proofs.push({
      owner,
      id,
      field: fieldPath,
      status: value === null ? "unresolved" : "confirmed",
      sources,
      ruleId: `client.catalog.${fieldPath}`,
      reasonCode: value === null ? reason : null,
    });
  };
  const assets = {
    image: (use: string | null): ImageUse | null => (use === null ? null : { use }),
  };
  const origin = (id: number, owner: SourceProof["owner"]) => {
    const result = acquisition(context, id);
    proof(
      id,
      "acquisition",
      result.value,
      source(result.sources),
      result.reason ?? "acquisition_unresolved",
      owner,
    );
    return toAcquisition(result.value);
  };
  const metadata = readCatalogMetadata(tables, context.gameplayTags.index);
  const tagIds = (id: number) => {
    const record = metadata.record(id);
    proofs.push(
      ...record.proofs.map(({ fieldPath, ...proof }) => ({
        owner: "item" as const,
        id,
        field: fieldPath,
        ...proof,
      })),
    );
    return record.value.tagIds;
  };
  const items: WithImageUses<Item>[] = [];
  const collections: WithImageUses<Collection>[] = [];
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
  const admitted = catalogAdmissionIds(
    context,
    neighborOutfits.map((outfit) => outfit.id),
  );
  const display = (id: number, field: number, name: string): string[] | null => {
    const values = splitTags(tables.string(context.ui.get(id), field)).map((key) =>
      context.vocabulary.renderDisplay(key),
    );
    const value =
      values.length && values.every((value): value is string => value !== null)
        ? [...new Set(values)]
        : null;
    proof(
      id,
      name,
      value,
      source(context.ui.get(id) ? [tableSource(tables, context.ui.get(id)!, [0, field])] : []),
      "display_key_missing_or_unresolved",
    );
    return value;
  };

  const toItem = (record: ObservedItem): WithImageUses<Item | Collection> => {
    const base = {
      id: record.id,
      name: record.name,
      description: record.description,
      quality: record.quality,
    };
    if (record.kind === "set" || record.kind === "series")
      return {
        ...base,
        image: assets.image(record.image),
        acquisition: origin(
          record.id,
          record.kind === "set" || record.kind === "series" ? "collection" : "item",
        ),
        memberKind: memberKinds[record.category]!,
        memberIds: record.memberIds,
      };
    const listed = { ...base, image: assets.image(record.image), tagIds: tagIds(record.id) };
    if (record.kind === "appearance")
      return {
        ...listed,
        kind: "appearance",
        category: record.subcategory,
        acquisition: origin(record.id, "item"),
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
        };
      case "clothing":
        return { ...item, kind: "clothing", category };
      case "creatures":
        return {
          ...item,
          kind: "creature",
          category,
          scientificName: record.attributes.scientificName,
          region: display(record.id, profile.fields.ui.region, "region"),
          habitat: display(record.id, profile.fields.ui.habitat, "habitat"),
          activeSeasons: display(record.id, profile.fields.ui.seasons, "activeSeasons"),
          activeTimes: display(record.id, profile.fields.ui.times, "activeTimes"),
          activeWeather: display(record.id, profile.fields.ui.weather, "activeWeather"),
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
        proof(
          record.id,
          "cooking",
          recipe ?? null,
          source(
            context.recipesByProduct.get(record.id)
              ? [tableSource(tables, context.recipesByProduct.get(record.id)!, [0, 4])]
              : [],
          ),
          "no_cooking_recipe",
        );
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
  const outfits = readOutfits(context, neighborOutfits, outfitSourcesById, neighborImage);
  items.push(...outfits.items);
  proofs.push(...outfits.proofs);
  const {
    cards,
    sets,
    proofs: cardProofs,
  } = readCreationCards(context, crafting.recipes, images, (id) => origin(id, "item"), tagIds);
  for (const card of cards) {
    if (admitted.has(card.id)) throw new Error(`Conflicting creation card identity ${card.id}`);
    admitted.add(card.id);
    items.push(card);
  }
  proofs.push(...cardProofs);
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
    if (item.kind === "creationCard")
      for (const material of item.recipe.materials ?? []) references.add(material.itemId);
    if (item.kind === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
    if (item.kind === "neighborClothing" && item.playerItemId !== null)
      references.add(item.playerItemId);
  }
  const referenced = readReferences(
    context,
    [...references].filter((id) => !formal.has(id)).sort((a, b) => a - b),
  );
  items.push(...referenced.items);
  proofs.push(...referenced.proofs);
  items.sort((a, b) => a.id - b.id);
  collections.sort((a, b) => a.id - b.id);
  return {
    catalog: { items, collections, creationCardSets: sets } satisfies CatalogObservation,
    proofs,
    crafting: crafting.audit,
  };
}

function verifyIngredientMemberships(
  context: ContentContext,
  items: readonly WithImageUses<Item>[],
): void {
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
