import { notFound } from "@tanstack/react-router";
import type { MiscellanyData } from "./data";
import { loadCollectionView } from "../collection-loader";
import type { CollectionView, FurnitureItem } from "../collection-view";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";

export type MiscellanyFurnitureUse = {
  furniture: FurnitureItem;
  recipes: { position: number; quantity: number }[];
};

export function parseMiscellanyId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function findMiscellanyDetail(data: MiscellanyData, value: string) {
  const id = parseMiscellanyId(value);
  const item = data.find((record) => record.id === id);
  if (!item) throw notFound();
  return item;
}

export function buildMiscellanyDetail(collection: CollectionView, id: number) {
  const record = collection.miscellaneous.find((item) => item.id === id);
  if (!record) throw notFound();
  const furnitureUses: MiscellanyFurnitureUse[] = collection.furniture.items.flatMap(
    (furniture) => {
      const recipes =
        furniture.craftingRecipes?.flatMap((recipe, index) => {
          const materials = recipe.materials?.filter((material) => material.itemId === id);
          return materials?.length
            ? [
                {
                  position: index + 1,
                  quantity: materials.reduce((total, material) => total + material.quantity, 0),
                },
              ]
            : [];
        }) ?? [];
      return recipes.length ? [{ furniture, recipes }] : [];
    },
  );
  return {
    record,
    sourceTrees: (collection.plants.sourceTreesByItemId.get(id) ?? []).flatMap(
      (tree) => collection.plants.itemRefs.get(tree.id) ?? [],
    ),
    cooking: ingredientUsage(buildIngredientsData(collection), id),
    furnitureUses,
  };
}

export type MiscellanyDetail = ReturnType<typeof buildMiscellanyDetail>;

export async function loadMiscellanyDetail(value: string): Promise<MiscellanyDetail> {
  const id = parseMiscellanyId(value);
  return buildMiscellanyDetail(await loadCollectionView(), id);
}
