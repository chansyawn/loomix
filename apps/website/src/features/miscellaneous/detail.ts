import { notFound } from "@tanstack/react-router";
import { sourceTreesForItem } from "../plants/model";
import type { MiscellaneousData } from "./data";
import { loadOmnidexView } from "../omnidex-loader";
import type { OmnidexView } from "../omnidex-view";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";

export function parseMiscellaneousId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function findMiscellaneousDetail(data: MiscellaneousData, value: string) {
  const id = parseMiscellaneousId(value);
  const item = data.find((record) => record.id === id);
  if (!item) throw notFound();
  return item;
}

export function buildMiscellaneousDetail(
  collection: OmnidexView,
  id: number,
  ingredients = buildIngredientsData(collection),
) {
  const record = collection.miscellaneous.find((item) => item.id === id);
  if (!record) throw notFound();
  return {
    record,
    sourceTrees: sourceTreesForItem(collection.plants, id),
    cooking: ingredientUsage(ingredients, id),
    furnitureUses: collection.furnitureUsesByMaterialId.get(id) ?? [],
  };
}

export type MiscellaneousDetail = ReturnType<typeof buildMiscellaneousDetail>;

export async function loadMiscellaneousDetail(value: string): Promise<MiscellaneousDetail> {
  const id = parseMiscellaneousId(value);
  return buildMiscellaneousDetail(await loadOmnidexView(), id);
}
