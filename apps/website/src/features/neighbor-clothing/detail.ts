import type { ItemOf } from "@loomix/schema/catalog";
import type { OverviewRecord } from "../collection/catalog";
import { formatNeighborClothingBodyTypes } from "./presentation";

export type NeighborClothingDetail = {
  kind: "neighborClothing";
  record: OverviewRecord & { record: ItemOf<"neighborClothing"> };
  neighborName: string | null;
  slotName: string | null;
  modelSizes: string;
  price: number | null;
};

export function neighborClothingDetail(
  row: OverviewRecord & { record: ItemOf<"neighborClothing"> },
  neighborName?: string,
): NeighborClothingDetail {
  return {
    kind: "neighborClothing",
    record: row,
    neighborName: neighborName ?? null,
    slotName: row.record.category,
    modelSizes: formatNeighborClothingBodyTypes(row.record.bodyTypes),
    price: row.record.price,
  };
}
