import type { ItemOf } from "@loomix/schema/catalog";
import type { CatalogEntryRow } from "../omnidex/catalog";
import { formatNeighborOutfitBodyTypes } from "./presentation";
import type { createResourceReader } from "@/infrastructure/resources";
import type { createImageResolver } from "@loomix/schema/assets";
import { parseNeighbors, type Neighbors } from "@loomix/schema/neighbors";
import { resolveNeighborPortrait } from "../neighbors/portrait";

const neighborDocuments = new Map<string, Promise<Neighbors>>();

export async function readOutfitNeighbor(
  load: ReturnType<typeof createResourceReader>,
  id: number,
  image: ReturnType<typeof createImageResolver>,
) {
  const { neighbors } = await load("neighbors", parseNeighbors, neighborDocuments);
  const neighbor = neighbors.find((entry) => entry.id === id);
  return neighbor
    ? {
        id,
        name: neighbor.name,
        image: resolveNeighborPortrait(neighbor.images, image)?.image ?? null,
      }
    : null;
}

export type NeighborOutfitDetail = {
  kind: "neighborOutfit";
  record: CatalogEntryRow & { record: ItemOf<"neighborOutfit"> };
  slotName: string | null;
  modelSizes: string;
};

export function neighborOutfitDetail(
  row: CatalogEntryRow & { record: ItemOf<"neighborOutfit"> },
): NeighborOutfitDetail {
  return {
    kind: "neighborOutfit",
    record: row,
    slotName: row.record.category,
    modelSizes: formatNeighborOutfitBodyTypes(row.record.bodyTypes),
  };
}
