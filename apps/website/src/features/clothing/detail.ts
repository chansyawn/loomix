import { notFound } from "@tanstack/react-router";
import { loadClothing } from "./data";
import type { ClothingData } from "./data";
import { membershipIndex } from "./query";
import type { View } from "./search";

export function parseClothingId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}
export function clothingDetail(data: ClothingData, view: View, id: number) {
  if (view === "items") {
    const record = data.items.find((row) => row.id === id);
    if (!record) throw notFound();
    return { kind: "item" as const, record, sets: membershipIndex(data.sets).get(id) ?? [] };
  }
  if (view === "appearances") {
    const record = data.appearances.find((row) => row.id === id);
    if (!record) throw notFound();
    return { kind: "appearance" as const, record };
  }
  const record = data.sets.find((row) => row.id === id);
  if (!record) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "set" as const,
    record,
    items: record.componentIds === null ? null : record.componentIds.map((id) => items.get(id)!),
  };
}
export type ClothingDetail = ReturnType<typeof clothingDetail>;
export async function loadClothingDetail(view: View, value: string): Promise<ClothingDetail> {
  const id = parseClothingId(value);
  return clothingDetail(await loadClothing(), view, id);
}
