import { parseAssets } from "@loomix/schema/assets";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { createResourceReader } from "@/infrastructure/resources";
import { toNeighborsView, type NeighborsData } from "./view";

export type { NeighborDetail, NeighborsData } from "./view";

export async function loadNeighbors(request: typeof fetch = fetch): Promise<NeighborsData> {
  const load = createResourceReader(request);
  const [database, assets, catalog, gameplayTags] = await Promise.all([
    load("neighbors", parseNeighbors),
    load("assets", parseAssets),
    load("catalog", parseCatalog),
    load("gameplay-tags", parseGameplayTags),
  ]);
  return toNeighborsView(database, assets, catalog, gameplayTags);
}
