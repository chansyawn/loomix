import type {
  Catalog,
  CraftingRecipe,
  IngredientCategory,
  Item,
  Quality,
  Recipe,
} from "@loomix/schema/catalog";
import type { Assets } from "@loomix/schema/assets";
import { createImageResolver } from "@loomix/schema/assets";
import { buildPlantsData } from "./plants/catalog";
import type { PlantsData } from "./plants/model";
export type { PlantItem, PlantSeries } from "./plants/model";

export interface CollectionRecord {
  id: number;
  name: string;
  image: string | null;
  description: string | null;
  quality: Quality | null;
}
type CategorizedRecord = CollectionRecord & { category: string | null };
export type FurnitureItem = CategorizedRecord & {
  type: string | null;
  size: string | null;
  colors: string | null;
  materials: string | null;
  sources: string | null;
  craftingRecipes: CraftingRecipe[] | null;
};
export type CreatureItem = CategorizedRecord & {
  region: string | null;
  habitat: string | null;
  activeSeasons: string | null;
  activeTimes: string | null;
  activeWeather: string | null;
  sizeRange: string | null;
};
export type DishItem = CollectionRecord & {
  difficulty: string | null;
  galaxyFlavor: string | null;
  cookware: string | null;
  effects: string | null;
  recipe: Recipe | null;
};
export type ClothingItem = CategorizedRecord & {
  colors: string | null;
  materials: string | null;
  styles: string | null;
  sources: string | null;
};
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
export type CatalogCategory =
  | "furniture"
  | "clothing"
  | "creatures"
  | "plants"
  | "dishes"
  | "miscellaneous";
export type IngredientItem = CollectionRecord & {
  catalogCategory: CatalogCategory;
  listed?: boolean;
};
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
export const displayValues = (values: string[] | null): string | null => values?.join("，") || null;
export function itemCategory(item: Item): CatalogCategory {
  switch (item.type) {
    case "creature":
      return "creatures";
    case "plant":
      return "plants";
    case "dish":
      return "dishes";
    case "material":
    case "reference":
      return "miscellaneous";
    default:
      return item.type;
  }
}
export function toCollectionView(catalog: Catalog, assets: Assets): CollectionView {
  if (catalog.snapshotId !== assets.snapshotId || catalog.locale !== assets.locale)
    throw new Error("Catalog assets context mismatch");
  const image = createImageResolver(assets);
  const base = (
    record: Pick<Item, "id" | "name" | "description" | "quality" | "image">,
  ): CollectionRecord => ({
    id: record.id,
    name: record.name,
    description: record.description,
    quality: record.quality,
    image: image(record.image),
  });
  const listed = new Set(
    catalog.entries.filter((entry) => entry.entity.kind === "item").map((entry) => entry.entity.id),
  );
  const groupIds = new Set(
    catalog.entries
      .filter((entry) => entry.entity.kind === "group")
      .map((entry) => entry.entity.id),
  );
  const appearanceIds = new Set(
    catalog.entries
      .filter((entry) => entry.entity.kind === "appearance")
      .map((entry) => entry.entity.id),
  );
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
    const common = base(record);
    view.ingredientItemsById.set(record.id, {
      ...common,
      catalogCategory: itemCategory(record),
      listed: listed.has(record.id),
    });
    if (!listed.has(record.id) || record.type === "reference") continue;
    const category = record.subcategory;
    switch (record.type) {
      case "furniture":
        view.furniture.items.push({
          ...common,
          category,
          type: record.furnitureType,
          size: record.size,
          colors: displayValues(record.colors),
          materials: displayValues(record.materials),
          sources: displayValues(record.sources),
          craftingRecipes: record.craftingRecipes,
        });
        break;
      case "clothing":
        view.clothing.items.push({
          ...common,
          category,
          colors: displayValues(record.colors),
          materials: displayValues(record.materials),
          styles: displayValues(record.styles),
          sources: displayValues(record.sources),
        });
        break;
      case "creature":
        view.creatures.items.push({
          ...common,
          category,
          region: displayValues(record.region),
          habitat: displayValues(record.habitat),
          activeSeasons: displayValues(record.activeSeasons),
          activeTimes: displayValues(record.activeTimes),
          activeWeather: displayValues(record.activeWeather),
          sizeRange: record.sizeRange,
        });
        break;
      case "dish":
        view.dishes.items.push({
          ...common,
          difficulty: record.difficulty,
          galaxyFlavor: record.galaxyFlavor,
          cookware: displayValues(record.cookware),
          effects: record.effectsText,
          recipe: record.recipe,
        });
        break;
      case "material":
        view.miscellaneous.push(common);
        break;
      case "plant":
        break;
    }
  }
  for (const group of catalog.groups) {
    if (!groupIds.has(group.id)) continue;
    const common = base(group);
    switch (group.type) {
      case "furniture.set":
        view.furniture.sets.push({
          ...common,
          seriesName: group.name,
          componentIds: group.memberIds,
        });
        break;
      case "clothing.set":
        view.clothing.sets.push({ ...common, setName: group.name, componentIds: group.memberIds });
        break;
      case "creatures.series":
        view.creatures.series.push({
          ...common,
          seriesName: group.name,
          creatureIds: group.memberIds,
        });
        break;
      case "dishes.series":
        view.dishes.series.push({ ...common, seriesName: group.name, dishIds: group.memberIds });
        break;
      case "plants.series":
        break;
    }
  }
  view.clothing.appearances = catalog.appearances
    .filter((record) => appearanceIds.has(record.id))
    .map((record) => ({ ...base(record), category: record.subcategory }));
  view.plants = buildPlantsData(catalog, assets, view.ingredientItemsById);
  return view;
}
