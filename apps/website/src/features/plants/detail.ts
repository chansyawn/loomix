import { notFound } from "@tanstack/react-router";
import type { PlantsData } from "./data";
import { loadPlants } from "./data";
import { membershipIndex } from "./query";
import type { View } from "./search";

export function parsePlantId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function plantsDetail(data: PlantsData, view: View, id: number) {
  if (view === "items") {
    const item = data.items.find((row) => row.id === id);
    if (!item) throw notFound();
    return {
      kind: "item" as const,
      record: item,
      series: membershipIndex(data.series).get(id) ?? [],
      hasUnconfirmedSeriesMembership: data.series.some((group) => group.plantIds === null),
    };
  }
  const series = data.series.find((row) => row.id === id);
  if (!series) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "series" as const,
    record: series,
    items: series.plantIds === null ? null : series.plantIds.map((id) => items.get(id)!),
  };
}

export type PlantsDetail = ReturnType<typeof plantsDetail>;

export async function loadPlantsDetail(view: View, value: string): Promise<PlantsDetail> {
  const id = parsePlantId(value);
  return plantsDetail(await loadPlants(), view, id);
}
