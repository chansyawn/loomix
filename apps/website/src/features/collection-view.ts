import type { IngredientCategory, ItemRecord, Recipe, RecordBase } from "@loomix/content-schema";
import type { CraftingRecipe } from "@loomix/content-schema/v4";
import type { CatalogV5 } from "@loomix/content-schema/v5";
import { buildPlantsData } from "./plants/catalog";
import type { PlantsData } from "./plants/model";
export type { PlantItem, PlantSeries } from "./plants/model";

export type CollectionRecord = Pick<
  RecordBase,
  "id" | "name" | "image" | "description" | "quality"
>;
type ItemAttributes<C extends ItemRecord["category"]> = Extract<
  ItemRecord,
  { category: C }
>["attributes"];
type CategorizedRecord = CollectionRecord & { category: string | null };

export type FurnitureItem = CategorizedRecord &
  ItemAttributes<"furniture"> & {
    craftingRecipes: CraftingRecipe[] | null;
  };
export type CreatureItem = CategorizedRecord & ItemAttributes<"creatures">;
export type DishItem = CollectionRecord & ItemAttributes<"dishes"> & { recipe: Recipe | null };
export type ClothingItem = CategorizedRecord & ItemAttributes<"clothing">;
export type ClothingAppearance = CategorizedRecord;
export type MiscellaneousItem = CollectionRecord;
export type FurnitureSet = CollectionRecord & {
  seriesName: string | null;
  componentIds: number[] | null;
};
export type ClothingSet = CollectionRecord & {
  setName: string | null;
  componentIds: number[] | null;
};
export type CreatureSeries = CollectionRecord & {
  seriesName: string | null;
  creatureIds: number[] | null;
};
export type DishSeries = CollectionRecord & { seriesName: string | null; dishIds: number[] | null };
export type IngredientItem = CollectionRecord & { catalogCategory: ItemRecord["category"] };

export interface CollectionView {
  ingredientCategories: IngredientCategory[];
  ingredientCategoriesById: ReadonlyMap<number, IngredientCategory>;
  ingredientItemsById: Map<number, IngredientItem>;
  furniture: { sets: FurnitureSet[]; items: FurnitureItem[] };
  creatures: { series: CreatureSeries[]; items: CreatureItem[] };
  plants: PlantsData;
  dishes: { series: DishSeries[]; items: DishItem[] };
  clothing: { sets: ClothingSet[]; items: ClothingItem[]; appearances: ClothingAppearance[] };
  miscellaneous: MiscellaneousItem[];
}

function collectionRecord(record: RecordBase): CollectionRecord {
  return {
    id: record.id,
    name: record.name,
    image: record.image,
    description: record.description,
    quality: record.quality,
  };
}

export function toCollectionView(catalog: CatalogV5): CollectionView {
  const view: CollectionView = {
    ingredientCategories: catalog.ingredientCategories,
    ingredientCategoriesById: new Map(
      catalog.ingredientCategories.map((category) => [category.id, category]),
    ),
    ingredientItemsById: new Map(),
    furniture: { sets: [], items: [] },
    creatures: { series: [], items: [] },
    plants: { series: [], items: [], itemRefs: new Map(), sourceTreesByItemId: new Map() },
    dishes: { series: [], items: [] },
    clothing: { sets: [], items: [], appearances: [] },
    miscellaneous: [],
  };

  for (const record of catalog.items) {
    const base = collectionRecord(record);
    if (record.kind === "set") {
      const componentIds = record.memberIds;
      if (record.category === "furniture")
        view.furniture.sets.push({ ...base, seriesName: record.name, componentIds });
      else view.clothing.sets.push({ ...base, setName: record.name, componentIds });
    } else if (record.kind === "series") {
      const series = { ...base, seriesName: record.name };
      switch (record.category) {
        case "creatures":
          view.creatures.series.push({ ...series, creatureIds: record.memberIds });
          break;
        case "plants":
          break;
        case "dishes":
          view.dishes.series.push({ ...series, dishIds: record.memberIds });
          break;
      }
    } else if (record.kind === "appearance") {
      view.clothing.appearances.push({ ...base, category: record.subcategory });
    } else {
      const category = record.subcategory;
      switch (record.category) {
        case "furniture":
          view.furniture.items.push({
            ...base,
            category,
            ...record.attributes,
            craftingRecipes: record.craftingRecipes,
          });
          view.ingredientItemsById.set(record.id, { ...base, catalogCategory: "furniture" });
          break;
        case "creatures":
          {
            const {
              sources: _sources,
              scientificName: _scientificName,
              ...attributes
            } = record.attributes;
            view.creatures.items.push({ ...base, category, ...attributes });
          }
          view.ingredientItemsById.set(record.id, { ...base, catalogCategory: "creatures" });
          break;
        case "plants":
          view.ingredientItemsById.set(record.id, { ...base, catalogCategory: "plants" });
          break;
        case "dishes":
          {
            const { sources: _sources, tastes: _tastes, ...attributes } = record.attributes;
            view.dishes.items.push({ ...base, ...attributes, recipe: record.recipe });
          }
          view.ingredientItemsById.set(record.id, { ...base, catalogCategory: "dishes" });
          break;
        case "clothing":
          view.clothing.items.push({ ...base, category, ...record.attributes });
          view.ingredientItemsById.set(record.id, { ...base, catalogCategory: "clothing" });
          break;
        case "miscellaneous":
          view.miscellaneous.push(base);
          view.ingredientItemsById.set(record.id, { ...base, catalogCategory: "miscellaneous" });
          break;
      }
    }
  }
  view.plants = buildPlantsData(catalog, view.ingredientItemsById);
  return view;
}
