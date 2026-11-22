import { createImageResolver, type Assets } from "@loomix/schema/assets";
import { createCatalogIndex, isListedItem, type Catalog, type Item } from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel, type GameplayTags } from "@loomix/schema/gameplay-tags";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { Vignette, Vignettes } from "@loomix/schema/vignettes";

export const siteLabels = { land: "陆地", "water-edge": "水边", beach: "沙滩" } as const;

type Target = Vignette["requirements"][number]["target"];
type ImageResolver = ReturnType<typeof createImageResolver>;
type DisplayItem = { id: number; name: string; image: string | null; browsable: boolean };
type Condition =
  | { kind: "item"; item: DisplayItem }
  | { kind: "tags"; labels: string[]; matches: DisplayItem[] };

function requiredEntry<Entry>(entry: Entry | undefined | null, description: string): Entry {
  if (entry == null) throw new Error(`Missing vignette ${description}`);
  return entry;
}

function summarize(
  { id, name, illustration, footprint, stars, site }: Vignette,
  image: ImageResolver,
) {
  return {
    id,
    name: name.zh,
    image: requiredEntry(image(illustration), `illustration ${id}`),
    size: `${footprint.width} × ${footprint.height} 格`,
    stars: `${stars} 星`,
    site,
    terrain: siteLabels[site],
  };
}

export function toVignetteList({ templates }: Vignettes, assets: Assets) {
  const image = createImageResolver(assets);
  return [...templates]
    .sort((left, right) => left.id - right.id)
    .map((entry) => summarize(entry, image));
}

export type VignetteSummary = ReturnType<typeof summarize>;

export function toVignetteDetail(
  id: number,
  {
    vignettes,
    assets,
    catalog,
    gameplayTags,
    neighbors,
  }: {
    vignettes: Vignettes;
    assets: Assets;
    catalog: Catalog;
    gameplayTags: GameplayTags;
    neighbors: Neighbors;
  },
) {
  const template = vignettes.templates.find((entry) => entry.id === id);
  if (!template) return null;

  const image = createImageResolver(assets);
  const { items } = createCatalogIndex(catalog);
  const fallback = new Map(vignettes.fallbackItems.map((entry) => [entry.id, entry.name.zh]));
  const neighborById = new Map(neighbors.neighbors.map((entry) => [entry.id, entry]));
  const tagIndex = createGameplayTagIndex(gameplayTags.tags);
  const subtrees = new Map<number, ReadonlySet<number>>();
  const tagMatches = new Map<string, DisplayItem[]>();
  const listedItems = [...items.values()]
    .filter(isListedItem)
    .sort((left, right) => left.id - right.id);

  function describeItem(item: Item): DisplayItem {
    return isListedItem(item)
      ? { id: item.id, name: item.name, image: image(item.image), browsable: true }
      : { id: item.id, name: item.name, image: null, browsable: false };
  }

  function subtree(tagId: number) {
    const existing = subtrees.get(tagId);
    if (existing) return existing;
    const group = new Set(tagIndex.subtree(tagId).map((tag) => tag.id));
    subtrees.set(tagId, group);
    return group;
  }

  function matchingItems(tagIds: number[]) {
    const key = [...tagIds].sort((left, right) => left - right).join(",");
    const existing = tagMatches.get(key);
    if (existing) return existing;
    const groups = tagIds.map(subtree);
    const matches = listedItems
      .filter((item) => groups.every((group) => item.tagIds.some((tag) => group.has(tag))))
      .map(describeItem);
    tagMatches.set(key, matches);
    return matches;
  }

  function describeCondition(target: Target): Condition {
    if ("allTagIds" in target) {
      return {
        kind: "tags",
        labels: target.allTagIds.map((tagId) => tagLabel(tagIndex.get(tagId))),
        matches: matchingItems(target.allTagIds),
      };
    }
    const { itemId } = target;
    const item = items.get(itemId);
    return {
      kind: "item",
      item: item
        ? describeItem(item)
        : {
            id: itemId,
            name: requiredEntry(fallback.get(itemId), `item ${itemId}`),
            image: null,
            browsable: false,
          },
    };
  }

  return {
    ...summarize(template, image),
    requirements: template.requirements.map(({ label, target, support, area, quantity }) => ({
      label: label.zh,
      target: describeCondition(target),
      support: support ? describeCondition(support) : null,
      area: area ? `${area.width} × ${area.height} 格` : null,
      quantity,
    })),
    creatures: template.creatureItemIds.map((itemId) => {
      const item = items.get(itemId);
      return describeItem(
        requiredEntry(item?.kind === "creature" ? item : undefined, `creature ${itemId}`),
      );
    }),
    neighbors: template.neighborIds.map((neighborId) => {
      const neighbor = requiredEntry(neighborById.get(neighborId), `neighbor ${neighborId}`);
      return {
        id: neighborId,
        name: neighbor.name,
        image: image(neighbor.images.role) ?? image(neighbor.images.favour),
      };
    }),
  };
}

export type VignetteDetail = NonNullable<ReturnType<typeof toVignetteDetail>>;
