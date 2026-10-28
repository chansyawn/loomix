import { notFound } from "@tanstack/react-router";
import type { MiscellanyData } from "./data";
import { loadCollectionView } from "../collection-loader";
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

export async function loadMiscellanyDetail(value: string) {
  parseMiscellanyId(value);
  const collection = await loadCollectionView();
  const record = findMiscellanyDetail(collection.miscellaneous, value);
  return { record, cooking: ingredientUsage(buildIngredientsData(collection), record.id) };
}
