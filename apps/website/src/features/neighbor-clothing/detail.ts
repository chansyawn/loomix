import type { OverviewRecord } from "../collection/catalog";
import type { NeighborClothing } from "@loomix/schema/catalog";

export type NeighborClothingDetail = {
  record: OverviewRecord & { record: NeighborClothing };
  neighborName: string | null;
  slotName: string | null;
  modelSizes: string;
  counterpartId: number | null;
};

export function neighborClothingDetail(
  row: OverviewRecord & { record: NeighborClothing },
  neighborName?: string,
): NeighborClothingDetail {
  const sizes = [
    row.record.modelPaths.small ? "小型" : null,
    row.record.modelPaths.medium ? "中型" : null,
    row.record.modelPaths.big ? "大型" : null,
  ].filter((value): value is string => value !== null);
  return {
    record: row,
    neighborName: neighborName ?? null,
    slotName: row.record.subcategory,
    modelSizes: sizes.join("、"),
    counterpartId: row.record.playerItemId,
  };
}
