import { createImageResolver, type ImageIndex } from "@loomix/schema/assets";
import { createCatalogIndex, isListedItem, type Catalog } from "@loomix/schema/catalog";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { Starsea } from "@loomix/schema/starsea";

type Island = Starsea["islands"][number];
type Region = Starsea["regions"][number];
type StarseaRegion = Pick<Region, "id" | "name" | "galaxyName" | "unlockTip">;

type RegionMembership = {
  region: StarseaRegion;
  exploration: boolean;
  neighborIds: Set<number>;
};

function requireEntry<Entry>(index: ReadonlyMap<number, Entry>, id: number, kind: string): Entry {
  const entry = index.get(id);
  if (!entry) throw new Error(`Unknown starsea ${kind}: ${id}`);
  return entry;
}

function indexStarsea(starsea: Starsea, image: ReturnType<typeof createImageResolver>) {
  const islandById = new Map(starsea.islands.map((island) => [island.id, island]));
  const styleById = new Map(starsea.iconStyles.map((style) => [style.id, style]));
  const membershipsByIsland = new Map<number, RegionMembership[]>();

  const regions = starsea.regions.map((source) => {
    const { id, name, galaxyName, unlockTip } = source;
    const region = { id, name, galaxyName, unlockTip };
    const local = new Map<number, RegionMembership>(
      source.explorationIslandIds.map((islandId) => [
        islandId,
        { region, exploration: true, neighborIds: new Set<number>() },
      ]),
    );
    for (const { neighborId, candidateIslandIds } of source.encounters) {
      for (const islandId of candidateIslandIds ?? []) {
        const membership = local.get(islandId) ?? {
          region,
          exploration: false,
          neighborIds: new Set<number>(),
        };
        membership.neighborIds.add(neighborId);
        local.set(islandId, membership);
      }
    }
    for (const [islandId, membership] of local) {
      requireEntry(islandById, islandId, "islet");
      const memberships = membershipsByIsland.get(islandId) ?? [];
      memberships.push(membership);
      membershipsByIsland.set(islandId, memberships);
    }
    return region;
  });

  function summarize(island: Island, memberships: RegionMembership[]) {
    const style = requireEntry(styleById, island.iconStyleId, "icon style");
    const illustration = image(island.illustration);
    return {
      id: island.id,
      name: island.name,
      image: illustration ?? image(style.icon),
      illustrated: illustration !== null,
      regions: memberships.map(({ region }) => region),
      encounterOnly: memberships.every(({ exploration }) => !exploration),
    };
  }

  return { regions, islandById, membershipsByIsland, summarize };
}

export function toStarseaList(starsea: Starsea, imageIndex: ImageIndex) {
  const { regions, islandById, membershipsByIsland, summarize } = indexStarsea(
    starsea,
    createImageResolver(imageIndex),
  );
  return {
    regions,
    islets: Array.from(membershipsByIsland, ([id, memberships]) =>
      summarize(requireEntry(islandById, id, "islet"), memberships),
    ),
  };
}

export type StarseaList = ReturnType<typeof toStarseaList>;
export type StarseaIslet = StarseaList["islets"][number];

export function toStarseaDetail(
  isletId: number,
  starsea: Starsea,
  imageIndex: ImageIndex,
  catalog: Catalog,
  neighbors: Neighbors,
) {
  const image = createImageResolver(imageIndex);
  const { islandById, membershipsByIsland, summarize } = indexStarsea(starsea, image);
  const memberships = membershipsByIsland.get(isletId);
  if (!memberships) return null;
  const island = requireEntry(islandById, isletId, "islet");
  const { items } = createCatalogIndex(catalog);
  const neighborById = new Map(neighbors.neighbors.map((neighbor) => [neighbor.id, neighbor]));
  const neighborIds = new Set(memberships.flatMap((membership) => [...membership.neighborIds]));

  function displayItems(ids: number[] | null) {
    return (
      ids?.map((id) => {
        const item = requireEntry(items, id, "item");
        const browsable = isListedItem(item);
        return { id, name: item.name, image: browsable ? image(item.image) : null, browsable };
      }) ?? null
    );
  }

  return {
    ...summarize(island, memberships),
    creatures: displayItems(island.displayedCreatureIds),
    specialties: displayItems(island.displayedSpecialtyIds),
    encounterNeighbors: Array.from(neighborIds, (id) => {
      const neighbor = requireEntry(neighborById, id, "neighbor");
      return {
        id,
        name: neighbor.name,
        image: image(neighbor.images.role) ?? image(neighbor.images.favour),
      };
    }),
  };
}

export type StarseaDetail = NonNullable<ReturnType<typeof toStarseaDetail>>;
