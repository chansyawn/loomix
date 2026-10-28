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
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  if (view === "items") {
    const item = itemsById.get(id);
    if (!item) throw notFound();
    const series = membershipIndex(data.series).get(id) ?? [];
    return {
      kind: "item" as const,
      record: item,
      series,
      relatedGroups: series.map((group) => ({
        series: group,
        items:
          group.plantIds?.flatMap((memberId) =>
            memberId !== id && itemsById.has(memberId) ? [itemsById.get(memberId)!] : [],
          ) ?? [],
      })),
      sourceTrees: (data.sourceTreesByItemId.get(id) ?? []).flatMap(
        (tree) => data.itemRefs.get(tree.id) ?? [],
      ),
      itemRefs: data.itemRefs,
      hasUnconfirmedSeriesMembership: data.series.some((group) => group.plantIds === null),
    };
  }
  const series = data.series.find((row) => row.id === id);
  if (!series) throw notFound();
  return {
    kind: "series" as const,
    record: series,
    items:
      series.plantIds === null ? null : series.plantIds.flatMap((id) => itemsById.get(id) ?? []),
    itemRefs: data.itemRefs,
  };
}

export type PlantsDetail = ReturnType<typeof plantsDetail>;

export async function loadPlantsDetail(view: View, value: string): Promise<PlantsDetail> {
  const id = parsePlantId(value);
  return plantsDetail(await loadPlants(), view, id);
}
