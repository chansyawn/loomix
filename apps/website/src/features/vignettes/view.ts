import { createImageResolver, type ImageIndex } from "@loomix/schema/assets";
import { createCatalogIndex, isListedItem, type Catalog, type Item } from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel, type GameplayTags } from "@loomix/schema/gameplay-tags";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { Vignette, Vignettes } from "@loomix/schema/vignettes";
import { hasCatalogItemDetail } from "../omnidex/catalog";
import { createRequirementMatcher, type RequirementTarget } from "./requirement-matching";

export const siteLabels = { land: "陆地", "water-edge": "水边", beach: "沙滩" } as const;

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

export function toVignetteList({ templates }: Vignettes, imageIndex: ImageIndex) {
  const image = createImageResolver(imageIndex);
  return [...templates]
    .sort((left, right) => left.id - right.id)
    .map((entry) => summarize(entry, image));
}

export type VignetteSummary = ReturnType<typeof summarize>;

export function toVignetteDetail(
  id: number,
  {
    vignettes,
    imageIndex,
    catalog,
    gameplayTags,
    neighbors,
  }: {
    vignettes: Vignettes;
    imageIndex: ImageIndex;
    catalog: Catalog;
    gameplayTags: GameplayTags;
    neighbors: Neighbors;
  },
) {
  const template = vignettes.templates.find((entry) => entry.id === id);
  if (!template) return null;

  const image = createImageResolver(imageIndex);
  const { items } = createCatalogIndex(catalog);
  const fallback = new Map(vignettes.fallbackItems.map((entry) => [entry.id, entry.name.zh]));
  const neighborById = new Map(neighbors.neighbors.map((entry) => [entry.id, entry]));
  const tagIndex = createGameplayTagIndex(gameplayTags.tags);
  const matchesRequirement = createRequirementMatcher(tagIndex);
  const tagMatches = new Map<string, DisplayItem[]>();
  const listedItems = [...items.values()]
    .filter(isListedItem)
    .sort((left, right) => left.id - right.id);

  function describeItem(item: Item): DisplayItem {
    return isListedItem(item)
      ? {
          id: item.id,
          name: item.name,
          image: image(item.image),
          browsable: hasCatalogItemDetail(item),
        }
      : { id: item.id, name: item.name, image: null, browsable: false };
  }

  function describeItemId(itemId: number): DisplayItem {
    const item = items.get(itemId);
    return item
      ? describeItem(item)
      : {
          id: itemId,
          name: requiredEntry(fallback.get(itemId), `item ${itemId}`),
          image: null,
          browsable: false,
        };
  }

  function matchingItems(tagIds: number[]) {
    const key = [...tagIds].sort((left, right) => left - right).join(",");
    const existing = tagMatches.get(key);
    if (existing) return existing;
    const matches = listedItems
      .filter((item) => matchesRequirement(item, { allTagIds: tagIds }))
      .map(describeItem);
    tagMatches.set(key, matches);
    return matches;
  }

  function describeCondition(target: RequirementTarget): Condition {
    if ("allTagIds" in target) {
      return {
        kind: "tags",
        labels: target.allTagIds.map((tagId) => tagLabel(tagIndex.get(tagId))),
        matches: matchingItems(target.allTagIds),
      };
    }
    return { kind: "item", item: describeItemId(target.itemId) };
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
    referenceItems: template.requirements.flatMap(({ examples }, index) =>
      examples.length
        ? [
            {
              position: index + 1,
              items: examples.map(({ itemId, quantity }) => ({
                item: describeItemId(itemId),
                quantity,
              })),
            },
          ]
        : [],
    ),
    placementRules: template.placementRules.map((rule) => {
      const targetName = (target: RequirementTarget) =>
        "itemId" in target
          ? describeItemId(target.itemId).name
          : target.allTagIds.map((tagId) => tagLabel(tagIndex.get(tagId))).join(" 且 ");
      const labels = {
        range: "在布景范围内摆放",
        adjacent: "相邻摆放",
        "near-water": "靠近水边",
        "align-water": "与水边对齐",
        "on-beach": "在沙滩上摆放",
      };
      const targets =
        rule.kind === "adjacent" ? rule.targets : rule.kind === "near-water" ? [rule.target] : [];
      return {
        id: rule.ruleId,
        label: rule.text?.zh ?? labels[rule.kind],
        targets: targets.map(targetName),
      };
    }),
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
