import type { Catalog, ItemRecord, RecordBase } from "@loomix/content-schema";

export type CollectionRecord = Pick<
  RecordBase,
  "id" | "name" | "image" | "description" | "quality"
>;
type ItemAttributes<C extends ItemRecord["category"]> = Extract<
  ItemRecord,
  { category: C }
>["attributes"];
type CategorizedRecord = CollectionRecord & { category: string | null };

export type FurnitureItem = CategorizedRecord & ItemAttributes<"furniture">;
export type CreatureItem = CategorizedRecord & ItemAttributes<"creatures">;
export type PlantItem = CategorizedRecord & ItemAttributes<"plants">;
export type DishItem = CollectionRecord & ItemAttributes<"dishes">;
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
export type PlantSeries = CollectionRecord & {
  seriesName: string | null;
  plantIds: number[] | null;
};
export type DishSeries = CollectionRecord & { seriesName: string | null; dishIds: number[] | null };

export interface CollectionView {
  furniture: { sets: FurnitureSet[]; items: FurnitureItem[] };
  creatures: { series: CreatureSeries[]; items: CreatureItem[] };
  plants: { series: PlantSeries[]; items: PlantItem[] };
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

export function toCollectionView(catalog: Catalog): CollectionView {
  const view: CollectionView = {
    furniture: { sets: [], items: [] },
    creatures: { series: [], items: [] },
    plants: { series: [], items: [] },
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
          view.plants.series.push({ ...series, plantIds: record.memberIds });
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
          view.furniture.items.push({ ...base, category, ...record.attributes });
          break;
        case "creatures":
          view.creatures.items.push({ ...base, category, ...record.attributes });
          break;
        case "plants":
          view.plants.items.push({ ...base, category, ...record.attributes });
          break;
        case "dishes":
          view.dishes.items.push({ ...base, ...record.attributes });
          break;
        case "clothing":
          view.clothing.items.push({ ...base, category, ...record.attributes });
          break;
        case "miscellaneous":
          view.miscellaneous.push(base);
          break;
      }
    }
  }
  return view;
}
