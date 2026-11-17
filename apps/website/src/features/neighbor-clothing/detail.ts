import type { ItemOf } from "@loomix/schema/catalog";
import type { OverviewRecord } from "../collection/catalog";

const bodyTypeNames = { small: "小型", medium: "中型", big: "大型" } as const;

export type NeighborClothingDetail = {
  record: OverviewRecord & { record: ItemOf<"neighborClothing"> };
  neighborName: string | null;
  slotName: string | null;
  modelSizes: string;
  price: number | null;
  counterpartId: number | null;
};

export function neighborClothingDetail(
  row: OverviewRecord & { record: ItemOf<"neighborClothing"> },
  neighborName?: string,
): NeighborClothingDetail {
  return {
    record: row,
    neighborName: neighborName ?? null,
    slotName: row.record.category,
    modelSizes: row.record.bodyTypes.map((type) => bodyTypeNames[type]).join("、"),
    price: row.record.price,
    counterpartId: row.record.playerItemId,
  };
}
