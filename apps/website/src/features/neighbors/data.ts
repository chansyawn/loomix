import { createImageResolver, parseImageIndex } from "@loomix/schema/assets";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseNeighbors, type Neighbors } from "@loomix/schema/neighbors";
import { createResourceReader } from "@/infrastructure/resources";
import { toNeighborsView, type NeighborsData } from "./view";

export type { NeighborDetail, NeighborsData } from "./view";

const neighborDocuments = new Map<string, Promise<Neighbors>>();

export function readNeighborDocument(read: ReturnType<typeof createResourceReader>) {
  return read("neighbors", parseNeighbors, neighborDocuments);
}

export async function readNeighborsData(load: ReturnType<typeof createResourceReader>) {
  const [database, imageIndex, catalog, gameplayTags] = await Promise.all([
    readNeighborDocument(load),
    load("image-index", parseImageIndex),
    load("catalog", parseCatalog),
    load("gameplay-tags", parseGameplayTags),
  ]);
  const image = createImageResolver(imageIndex);
  return { view: toNeighborsView(database, image, catalog, gameplayTags), image };
}

export async function loadNeighbors(request: typeof fetch = fetch): Promise<NeighborsData> {
  return (await readNeighborsData(createResourceReader(request))).view;
}
