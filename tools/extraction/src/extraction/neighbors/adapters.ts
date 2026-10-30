import { isAllowedNeighbor, neighborAllowlist } from "./allowlist.ts";
import { profile } from "../../profile.ts";
import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../types.ts";
import { assertLayout, localized, normalizedPath, requiredId, requiredText } from "./fields.ts";
import type { Layout } from "./fields.ts";
import type {
  NeighborBodyType,
  NeighborEvidence,
  NeighborExclusion,
  NeighborRecord,
  NeighborStar,
  NeighborStoryChapter,
  NeighborTravelReaction,
} from "./types.ts";

const layouts = {
  npc: {
    id: [0, "uint"],
    name: [1, "text"],
    avatar: [2, "string"],
    model: [3, "string"],
    scale: [4, "float"],
    type: [5, "string"],
  },
  star: {
    galaxy: [0, "uint"],
    galaxyName: [1, "text"],
    system: [2, "uint"],
    star: [3, "uint"],
    npc: [5, "uint"],
    name: [6, "text"],
    galaxyModel: [11, "string"],
    playerModel: [12, "string"],
    sky: [13, "string"],
    illustration: [15, "string"],
  },
  story: {
    npc: [0, "uint"],
    chapter: [1, "uint"],
    title: [2, "text"],
    sequence: [3, "uint"],
    body: [4, "text"],
    illustration: [5, "string"],
  },
  reaction: {
    npc: [0, "uint"],
    variant: [1, "uint"],
    condition: [2, "string"],
    threshold: [3, "string"],
    secondary: [4, "string"],
    asset: [7, "string"],
    text: [8, "text"],
  },
} as const satisfies Record<string, Layout>;

export function evidence(
  collection: NeighborEvidence["collection"],
  key: string,
  row: TableRow,
  fields: number[],
): NeighborEvidence {
  return {
    collection,
    key,
    source: { file: "prepared/ed.obb", table: row.root, rowOffset: row.rowOffset, fields },
  };
}

export function readRoster(
  tables: Tables,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): NeighborRecord[] {
  const found = new Set<number>();
  const neighbors: NeighborRecord[] = [];
  const bodyTypes: Record<string, NeighborBodyType> = {
    NpcSmall: "small",
    NpcMedium: "medium",
    NpcBig: "big",
  };
  for (const row of tables.rows(profile.roots.neighborsNpc)) {
    assertLayout(tables, row, layouts.npc, 6);
    const id = requiredId(tables, row, 0);
    if (found.has(id)) throw new Error(`Duplicate NPC master ${id}`);
    found.add(id);
    const name = localized(tables, row, 1);
    const model = normalizedPath(tables.string(row, 3));
    if (!isAllowedNeighbor(id)) {
      exclusions.push({
        kind: "npc",
        key: String(id),
        reason: "not_in_allowlist",
        sources: [evidence("neighbors", String(id), row, [0, 1, 3]).source],
      });
      continue;
    }
    const expected = neighborAllowlist.find((neighbor) => neighbor.id === id)!;
    if (!name?.trim() || !model) throw new Error(`Missing formal neighbor master ${id}`);
    if (name !== expected.name) throw new Error(`Neighbor name differs from allowlist: ${id}`);
    const type = tables.string(row, 5);
    if (type !== null && !bodyTypes[type]) throw new Error(`Unknown neighbor body type ${type}`);
    const scaleValue = tables.float(row, 4);
    if (scaleValue !== null && (!Number.isFinite(scaleValue) || scaleValue <= 0))
      throw new Error(`Invalid NPC scale ${id}`);
    neighbors.push({
      id,
      nameZh: name!,
      bodyType: type === null ? null : bodyTypes[type]!,
      scaleValue,
      avatarPath: normalizedPath(tables.string(row, 2)),
      npc2Path: requiredText(model, `npc2:${id}`),
      starKeys: [],
      storyKeys: [],
      furnishingThemeIds: [],
      furnishingThemeKeys: [],
      rewardItemIds: [],
      assetPaths: [],
    });
    records.push(evidence("neighbors", String(id), row, [0, 1, 2, 3, 4, 5]));
  }
  for (const { id } of neighborAllowlist)
    if (!found.has(id)) throw new Error(`Missing formal neighbor master ${id}`);
  return neighbors.sort((a, b) => a.id - b.id);
}

export function readStars(
  tables: Tables,
  accepted: Set<number>,
  records: NeighborEvidence[],
): NeighborStar[] {
  const stars: NeighborStar[] = [];
  for (const row of tables.rows(profile.roots.neighborStars)) {
    assertLayout(tables, row, layouts.star, 16);
    const npcId = requiredId(tables, row, 5);
    if (!accepted.has(npcId)) continue;
    const galaxyIndex = tables.uint(row, 0);
    const systemIndex = tables.uint(row, 2);
    const starIndex = tables.uint(row, 3);
    const key = `${npcId}:${galaxyIndex}:${systemIndex}:${starIndex}`;
    stars.push({
      key,
      npcId,
      galaxyNameZh: localized(tables, row, 1),
      galaxyIndex,
      systemIndex,
      starIndex,
      nameZh: requiredText(localized(tables, row, 6), key),
      galaxyModelPath: normalizedPath(tables.string(row, 11)),
      playerModelPath: normalizedPath(tables.string(row, 12)),
      skyModelPath: normalizedPath(tables.string(row, 13)),
      illustrationPath: normalizedPath(tables.string(row, 15)),
    });
    records.push(
      evidence(
        "stars",
        key,
        row,
        Object.values(layouts.star).map(([field]) => field),
      ),
    );
  }
  return stars;
}

export function readStories(
  tables: Tables,
  accepted: Set<number>,
  records: NeighborEvidence[],
): NeighborStoryChapter[] {
  const chapters = new Map<string, NeighborStoryChapter>();
  for (const row of tables.rows(profile.roots.neighborStories)) {
    assertLayout(tables, row, layouts.story, 11);
    const npcId = requiredId(tables, row, 0);
    if (!accepted.has(npcId)) continue;
    const chapter = requiredId(tables, row, 1);
    const key = `${npcId}:${chapter}`;
    const title = localized(tables, row, 2);
    const entry = chapters.get(key) ?? { key, npcId, chapter, titleZh: "", paragraphs: [] };
    if (title !== null) {
      if (entry.titleZh && entry.titleZh !== title)
        throw new Error(`Conflicting story title ${key}`);
      entry.titleZh = title;
    }
    const sequence = requiredId(tables, row, 3);
    if (entry.paragraphs.some((p) => p.sequence === sequence))
      throw new Error(`Duplicate story paragraph ${key}/${sequence}`);
    entry.paragraphs.push({
      sequence,
      bodyZh: localized(tables, row, 4),
      illustrationPath: normalizedPath(tables.string(row, 5)),
    });
    chapters.set(key, entry);
    records.push(evidence("stories", `${key}:${sequence}`, row, [0, 1, 2, 3, 4, 5]));
  }
  for (const entry of chapters.values()) requiredText(entry.titleZh, entry.key);
  return [...chapters.values()];
}

export function readTravelReactions(
  tables: Tables,
  accepted: Set<number>,
  records: NeighborEvidence[],
): NeighborTravelReaction[] {
  const reactions: NeighborTravelReaction[] = [];
  for (const row of tables.rows(profile.roots.neighborTravelReactions)) {
    assertLayout(tables, row, layouts.reaction, 9);
    const npcId = tables.uint(row, 0);
    if (npcId !== null && !accepted.has(npcId)) continue;
    const variantId = requiredId(tables, row, 1);
    const conditionType = tables.string(row, 2);
    const resourceCondition = conditionType === "Npc_Get_Items_Num_In_Travel";
    const key = `${npcId ?? "fallback"}:${variantId}`;
    reactions.push({
      key,
      npcId,
      variantId,
      conditionType,
      threshold: tables.string(row, resourceCondition ? 4 : 3),
      resourceCategory: resourceCondition ? tables.string(row, 3) : null,
      secondaryThreshold: resourceCondition ? null : tables.string(row, 4),
      reactionAsset: normalizedPath(tables.string(row, 7)),
      textZh: localized(tables, row, 8),
    });
    records.push(evidence("travelReactions", key, row, [0, 1, 2, 3, 4, 7, 8]));
  }
  return reactions;
}
