import type { ItemOf } from "@loomix/schema/catalog";
import type { CatalogEntryRow } from "../omnidex/catalog";
import { formatNeighborOutfitBodyTypes } from "./presentation";

export type NeighborOutfitDetail = {
  kind: "neighborOutfit";
  record: CatalogEntryRow & { record: ItemOf<"neighborOutfit"> };
  neighborName: string | null;
  slotName: string | null;
  modelSizes: string;
  price: number | null;
};

export function neighborOutfitDetail(
  row: CatalogEntryRow & { record: ItemOf<"neighborOutfit"> },
  neighborName?: string,
): NeighborOutfitDetail {
  return {
    kind: "neighborOutfit",
    record: row,
    neighborName: neighborName ?? null,
    slotName: row.record.category,
    modelSizes: formatNeighborOutfitBodyTypes(row.record.bodyTypes),
    price: row.record.price,
  };
}
