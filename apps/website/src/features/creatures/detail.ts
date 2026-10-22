import { notFound } from "@tanstack/react-router";
import type { CreaturesData } from "./data";
import { loadCreatures } from "./data";
import { membershipIndex } from "./query";
import type { View } from "./search";

export function parseCreaturesId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function creaturesDetail(data: CreaturesData, view: View, id: number) {
  if (view === "items") {
    const item = data.items.find((row) => row.id === id);
    if (!item) throw notFound();
    return {
      kind: "item" as const,
      record: item,
      catalogItems: data.items,
      series: membershipIndex(data.series).get(id) ?? [],
    };
  }
  const series = data.series.find((row) => row.id === id);
  if (!series) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "series" as const,
    record: series,
    items: series.creatureIds === null ? null : series.creatureIds.map((id) => items.get(id)!),
  };
}

export type CreaturesDetail = ReturnType<typeof creaturesDetail>;

export async function loadCreaturesDetail(view: View, value: string): Promise<CreaturesDetail> {
  const id = parseCreaturesId(value);
  return creaturesDetail(await loadCreatures(), view, id);
}
