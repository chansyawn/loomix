import { createImageResolver, type ImageIndex } from "@loomix/schema/assets";
import { createCatalogIndex, isListedItem, type Catalog, type Item } from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel, type GameplayTags } from "@loomix/schema/gameplay-tags";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { Vignette, Vignettes } from "@loomix/schema/vignettes";
import { hasCatalogItemDetail } from "../omnidex/catalog";
import {
  createRequirementMatcher,
  resolveRequirementSize,
  type RequirementSize,
  type RequirementTarget,
} from "./requirement-matching";

export const siteLabels = { land: "陆地", "water-edge": "水边", beach: "沙滩" } as const;

type ImageResolver = ReturnType<typeof createImageResolver>;
type DisplayItem = { id: number; name: string; image: string | null; browsable: boolean };
type Condition =
  | { kind: "item"; item: DisplayItem }
  | { kind: "tags"; labels: string[]; matches: DisplayItem[] };

function targetKey(target: RequirementTarget) {
  return "itemId" in target
    ? `item:${target.itemId}`
    : `tags:${[...new Set(target.allTagIds)].sort((left, right) => left - right).join(",")}`;
}

function describePlacement(template: Vignette, targetName: (target: RequirementTarget) => string) {
  const rowByTarget = new Map<string, number | null>();
  const rowInstructions = template.requirements.map(({ target }, index) => {
    const key = targetKey(target);
    rowByTarget.set(key, rowByTarget.has(key) ? null : index);
    return new Set<string>();
  });
  const labels = {
    adjacent: "相邻摆放",
    "near-water": "靠近水域",
    "align-water": "与水边对齐",
    "on-beach": "在沙滩上摆放",
  };
  const placementRules = template.placementRules.flatMap((rule) => {
    if (rule.kind === "range") return [];
    const targets =
      rule.kind === "adjacent" ? rule.targets : rule.kind === "near-water" ? [rule.target] : [];
    const names = targets.map(targetName);
    const rows = targets.flatMap((target) => rowByTarget.get(targetKey(target)) ?? []);
    const label = rule.text?.zh ?? labels[rule.kind];
    if (!rows.length || rows.length !== targets.length) {
      return [{ id: rule.ruleId, label, targets: [...new Set(names)] }];
    }

    if (rule.kind === "near-water") {
      rowInstructions[rows[0]!]!.add(labels[rule.kind]);
    } else if (rows.length === 2 && rows[0] !== rows[1]) {
      rowInstructions[rows[0]!]!.add(`与${names[1]}相邻摆放`);
      rowInstructions[rows[1]!]!.add(`与${names[0]}相邻摆放`);
    } else {
      const instruction = rule.text?.zh ?? `所有${[...new Set(names)].join("、")}相邻摆放`;
      for (const row of rows) rowInstructions[row]!.add(instruction);
    }
    return [];
  });
  return { rowInstructions, placementRules };
}

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

  function matchingItems(tagIds: number[], size?: RequirementSize) {
    const key = `${size ? (size.tagId ?? "missing") : "any"}:${[...tagIds].sort((left, right) => left - right).join(",")}`;
    const existing = tagMatches.get(key);
    if (existing) return existing;
    const matches = listedItems
      .filter((item) => matchesRequirement(item, { allTagIds: tagIds }, size))
      .map(describeItem);
    tagMatches.set(key, matches);
    return matches;
  }

  function describeCondition(target: RequirementTarget, size?: RequirementSize): Condition {
    if ("allTagIds" in target) {
      return {
        kind: "tags",
        labels: target.allTagIds.map((tagId) => tagLabel(tagIndex.get(tagId))),
        matches: matchingItems(target.allTagIds, size),
      };
    }
    return { kind: "item", item: describeItemId(target.itemId) };
  }

  function describeTargetName(target: RequirementTarget) {
    return "itemId" in target
      ? describeItemId(target.itemId).name
      : target.allTagIds.map((tagId) => tagLabel(tagIndex.get(tagId))).join(" 且 ");
  }

  const { rowInstructions, placementRules } = describePlacement(template, describeTargetName);

  return {
    ...summarize(template, image),
    requirements: template.requirements.map(
      ({ label, target, support, area, quantity, examples }, index) => {
        const size = resolveRequirementSize(area, tagIndex);
        const shownExamples = examples.map(({ itemId, quantity }) => ({
          item: describeItemId(itemId),
          quantity,
        }));
        const condition = describeCondition(target, size);
        if (
          condition.kind === "item" &&
          !examples.some(({ itemId }) => itemId === condition.item.id)
        ) {
          shownExamples.unshift({ item: condition.item, quantity: quantity.displayed });
        }
        return {
          label: label.zh,
          target: condition,
          support: support ? describeTargetName(support) : null,
          sizeLabel: size?.label ?? null,
          quantity: quantity.displayed,
          instructions: [...rowInstructions[index]!],
          examples: shownExamples,
        };
      },
    ),
    placementRules,
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
