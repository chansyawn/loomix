import { createImageResolver, type ImageIndex } from "@loomix/schema/assets";
import { createCatalogIndex, isListedItem, type Catalog } from "@loomix/schema/catalog";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { Starsea } from "@loomix/schema/starsea";
import { resolveNeighborPortrait } from "../neighbors/portrait";

type Islet = Starsea["islets"][number];
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
  const isletById = new Map(starsea.islets.map((islet) => [islet.id, islet]));
  const styleById = new Map(starsea.iconStyles.map((style) => [style.id, style]));
  const membershipsByIslet = new Map<number, RegionMembership[]>();

  const regions = starsea.regions.map((source) => {
    const { id, name, galaxyName, unlockTip } = source;
    const region = { id, name, galaxyName, unlockTip };
    const local = new Map<number, RegionMembership>(
      source.explorationIsletIds.map((isletId) => [
        isletId,
        { region, exploration: true, neighborIds: new Set<number>() },
      ]),
    );
    for (const { neighborId, candidateIsletIds } of source.encounters) {
      for (const isletId of candidateIsletIds ?? []) {
        const membership = local.get(isletId) ?? {
          region,
          exploration: false,
          neighborIds: new Set<number>(),
        };
        membership.neighborIds.add(neighborId);
        local.set(isletId, membership);
      }
    }
    for (const [isletId, membership] of local) {
      requireEntry(isletById, isletId, "islet");
      const memberships = membershipsByIslet.get(isletId) ?? [];
      memberships.push(membership);
      membershipsByIslet.set(isletId, memberships);
    }
    return region;
  });

  function summarize(islet: Islet, memberships: RegionMembership[]) {
    const style = requireEntry(styleById, islet.iconStyleId, "icon style");
    const illustration = image(islet.illustration);
    return {
      id: islet.id,
      name: islet.name,
      image: illustration ?? image(style.icon),
      illustrated: illustration !== null,
      regions: memberships.map(({ region }) => region),
      encounterOnly: memberships.every(({ exploration }) => !exploration),
    };
  }

  return { regions, isletById, membershipsByIslet, summarize };
}

export function toStarseaList(starsea: Starsea, imageIndex: ImageIndex) {
  const { regions, isletById, membershipsByIslet, summarize } = indexStarsea(
    starsea,
    createImageResolver(imageIndex),
  );
  return {
    regions,
    islets: Array.from(membershipsByIslet, ([id, memberships]) =>
      summarize(requireEntry(isletById, id, "islet"), memberships),
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
  const { isletById, membershipsByIslet, summarize } = indexStarsea(starsea, image);
  const memberships = membershipsByIslet.get(isletId);
  if (!memberships) return null;
  const islet = requireEntry(isletById, isletId, "islet");
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
    ...summarize(islet, memberships),
    creatures: displayItems(islet.displayedCreatureIds),
    specialties: displayItems(islet.displayedSpecialtyIds),
    encounterNeighbors: Array.from(neighborIds, (id) => {
      const neighbor = requireEntry(neighborById, id, "neighbor");
      return {
        id,
        name: neighbor.name,
        image: resolveNeighborPortrait(neighbor.images, image)?.image ?? null,
      };
    }),
  };
}

export type StarseaDetail = NonNullable<ReturnType<typeof toStarseaDetail>>;
