import { formatFurnitureSize } from "./furniture/size";
import { createRecordTagResolver, isListedItem } from "@loomix/schema/catalog";
import type {
  Catalog,
  Collection,
  CollectionMemberKind,
  CraftingRecipe,
  DishEffect,
  ItemKind,
  ItemOf,
  ListedItem,
  Quality,
  RecipeSlot,
  UnlockCondition,
  CookingRecipe,
} from "@loomix/schema/catalog";
import type { Assets } from "@loomix/schema/assets";
import { createImageResolver } from "@loomix/schema/assets";
import { acquisitionText } from "./collection/acquisition";
import { tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { createIngredientTagSource } from "./ingredients/tag-source";
import type { IngredientTagSource } from "./ingredients/tag-source";
import { buildPlantsData } from "./plants/catalog";
import type { PlantsData } from "./plants/model";
export type { PlantItem, PlantSeries } from "./plants/model";
export type { DishEffect } from "@loomix/schema/catalog";

export interface CatalogEntrySummary {
  id: number;
  name: string;
  image: string | null;
  description: string | null;
  quality: Quality | null;
}
type CategorizedRecord = CatalogEntrySummary & { category: string | null };
export type FurnitureItem = CategorizedRecord & {
  furnitureCategory: string | null;
  size: string | null;
  colors: string | null;
  materials: string | null;
  acquisition: string | null;
  craftingRecipes: CraftingRecipe[];
};
export type CreatureItem = CategorizedRecord & {
  scientificName: string | null;
  acquisition: string | null;
  region: string | null;
  habitat: string | null;
  activeSeasons: string | null;
  activeTimes: string | null;
  activeWeather: string | null;
  sizeRange: string | null;
};
export type DishItem = CatalogEntrySummary & {
  difficulty: string | null;
  galaxyFlavor: string | null;
  cookware: string | null;
  strength: number | null;
  effects: DishEffect[] | null;
  tastes: CookingRecipe["tastes"];
  unlockCondition: UnlockCondition | null;
  acquisition: string | null;
  slots: RecipeSlot[];
};
export type ClothingItem = CategorizedRecord & {
  colors: string | null;
  materials: string | null;
  styles: string | null;
  acquisition: string | null;
};
export type ClothingAppearance = CategorizedRecord;
export type MiscellaneousItem = CatalogEntrySummary & {
  acquisition: string | null;
};
export type FurnitureSet = CatalogEntrySummary & {
  seriesName: string | null;
  componentIds: number[] | null;
};
export type ClothingSet = CatalogEntrySummary & {
  setName: string | null;
  componentIds: number[] | null;
};
export type CreatureSeries = CatalogEntrySummary & {
  seriesName: string | null;
  creatureIds: number[] | null;
};
export type DishSeries = CatalogEntrySummary & {
  seriesName: string | null;
  dishIds: number[] | null;
};
export type CatalogCategory =
  | "furniture"
  | "clothing"
  | "neighborClothing"
  | "creatures"
  | "plants"
  | "dishes"
  | "miscellaneous";
export type IngredientItem = CatalogEntrySummary & {
  catalogCategory: CatalogCategory;
  // 仅表示通用物品关联视图中的浏览与链接资格，不代表正式收录状态。
  browsable?: boolean;
};
export interface CollectionView {
  ingredientTagSource: IngredientTagSource;
  ingredientItemsById: Map<number, IngredientItem>;
  furniture: { sets: FurnitureSet[]; items: FurnitureItem[] };
  creatures: { series: CreatureSeries[]; items: CreatureItem[] };
  plants: PlantsData;
  dishes: { series: DishSeries[]; items: DishItem[] };
  clothing: { sets: ClothingSet[]; items: ClothingItem[]; appearances: ClothingAppearance[] };
  miscellaneous: MiscellaneousItem[];
}

const categoryByKind = {
  furniture: "furniture",
  clothing: "clothing",
  appearance: "clothing",
  neighborClothing: "neighborClothing",
  creature: "creatures",
  plant: "plants",
  seed: "plants",
  dish: "dishes",
  material: "miscellaneous",
  reference: "miscellaneous",
} as const satisfies Record<ItemKind, CatalogCategory>;

export function catalogCategory(
  entry: { kind: ItemKind } | { memberKind: CollectionMemberKind },
): CatalogCategory {
  return categoryByKind["kind" in entry ? entry.kind : entry.memberKind];
}
export const isCollection = (entry: ListedItem | Collection): entry is Collection =>
  "memberKind" in entry;

export const displayValues = (values: readonly string[] | null): string | null =>
  values?.join("，") || null;
const sizeRange = (size: ItemOf<"creature">["size"]): string | null =>
  size ? `${size.min}–${size.max}${size.unit}` : null;

export function toCollectionView(
  catalog: Catalog,
  assets: Assets,
  tagIndex: GameplayTagIndex,
): CollectionView {
  const image = createImageResolver(assets);
  const resolveTags = createRecordTagResolver(tagIndex);
  const tagsFor = (
    record: { tagIds: readonly number[] },
    facet: Parameters<typeof resolveTags>[1],
  ) => displayValues(resolveTags(record, facet).map(tagLabel));
  const base = (
    record: Pick<ListedItem | Collection, "id" | "name" | "description" | "quality" | "image">,
  ): CatalogEntrySummary => ({
    id: record.id,
    name: record.name,
    description: record.description,
    quality: record.quality,
    image: image(record.image),
  });
  const listed = catalog.items.filter(isListedItem);
  const view: CollectionView = {
    ingredientTagSource: createIngredientTagSource(tagIndex, listed),
    ingredientItemsById: new Map(),
    furniture: { sets: [], items: [] },
    creatures: { series: [], items: [] },
    plants: {
      series: [],
      items: [],
      seeds: [],
      itemRefs: new Map(),
      sourceTreesByItemId: new Map(),
    },
    dishes: { series: [], items: [] },
    clothing: { sets: [], items: [], appearances: [] },
    miscellaneous: [],
  };
  for (const item of catalog.items) {
    // 友邻服饰有独立详情，但与仅供引用物品一样，不参与通用关联视图的浏览与链接。
    view.ingredientItemsById.set(item.id, {
      id: item.id,
      name: item.name,
      description: item.description,
      quality: item.kind === "reference" ? null : item.quality,
      image: item.kind === "reference" ? null : image(item.image),
      catalogCategory: catalogCategory(item),
      browsable: item.kind !== "reference" && item.kind !== "neighborClothing",
    });
  }
  for (const item of listed) {
    const common = base(item);
    const acquisition = acquisitionText(item.acquisition);
    switch (item.kind) {
      case "furniture":
        view.furniture.items.push({
          ...common,
          category: item.category,
          furnitureCategory: item.furnitureCategory,
          size: item.size && formatFurnitureSize(item.size),
          colors: tagsFor(item, "colors"),
          materials: tagsFor(item, "materials"),
          acquisition,
          craftingRecipes: item.craftingRecipes,
        });
        break;
      case "clothing":
        view.clothing.items.push({
          ...common,
          category: item.category,
          colors: tagsFor(item, "colors"),
          materials: tagsFor(item, "materials"),
          styles: tagsFor(item, "styles"),
          acquisition,
        });
        break;
      case "appearance":
        view.clothing.appearances.push({ ...common, category: item.category });
        break;
      case "creature":
        view.creatures.items.push({
          ...common,
          category: item.category,
          scientificName: item.scientificName,
          acquisition,
          region: displayValues(item.region),
          habitat: displayValues(item.habitat),
          activeSeasons: displayValues(item.activeSeasons),
          activeTimes: displayValues(item.activeTimes),
          activeWeather: displayValues(item.activeWeather),
          sizeRange: sizeRange(item.size),
        });
        break;
      case "dish":
        view.dishes.items.push({
          ...common,
          difficulty: item.cooking?.difficulty ?? null,
          galaxyFlavor: tagsFor(item, "origins"),
          cookware: item.cooking?.cookware ?? null,
          strength: item.strength,
          effects: item.effects,
          tastes: item.cooking?.tastes ?? null,
          unlockCondition: item.cooking?.unlockCondition ?? null,
          acquisition,
          slots: item.cooking?.slots ?? [],
        });
        break;
      case "material":
        view.miscellaneous.push({ ...common, acquisition });
        break;
    }
  }
  for (const collection of catalog.collections) {
    const common = base(collection);
    const memberIds = collection.memberIds;
    switch (collection.memberKind) {
      case "furniture":
        view.furniture.sets.push({
          ...common,
          seriesName: collection.name,
          componentIds: memberIds,
        });
        break;
      case "clothing":
        view.clothing.sets.push({ ...common, setName: collection.name, componentIds: memberIds });
        break;
      case "creature":
        view.creatures.series.push({
          ...common,
          seriesName: collection.name,
          creatureIds: memberIds,
        });
        break;
      case "dish":
        view.dishes.series.push({ ...common, seriesName: collection.name, dishIds: memberIds });
        break;
      case "plant":
        break;
    }
  }
  view.plants = buildPlantsData(catalog, assets, view.ingredientItemsById, tagIndex);
  return view;
}
