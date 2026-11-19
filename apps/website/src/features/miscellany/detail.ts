import { notFound } from "@tanstack/react-router";
import type { MiscellanyData } from "./data";
import { loadCollectionView } from "../collection-loader";
import type { CollectionView } from "../collection-view";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";

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
  return {
    record,
    sourceTrees: (collection.plants.sourceTreesByItemId.get(id) ?? []).flatMap(
      (tree) => collection.plants.itemRefs.get(tree.id) ?? [],
    ),
    cooking: ingredientUsage(buildIngredientsData(collection), id),
    furnitureUses: collection.furnitureUsesByMaterialId.get(id) ?? [],
  };
}

export type MiscellanyDetail = ReturnType<typeof buildMiscellanyDetail>;

export async function loadMiscellanyDetail(value: string): Promise<MiscellanyDetail> {
  const id = parseMiscellanyId(value);
  return buildMiscellanyDetail(await loadCollectionView(), id);
}
