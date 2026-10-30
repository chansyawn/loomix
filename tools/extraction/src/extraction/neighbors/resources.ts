import { isAllowedNeighbor } from "./allowlist.ts";
import type { Catalog } from "../schema.ts";
import { profile } from "../../profile.ts";
import type { Tables } from "../decode/tables.ts";
import { evidence } from "./adapters.ts";
import { assertLayout, normalizedPath } from "./fields.ts";
import type {
  NeighborAssetRef,
  NeighborDatabase,
  NeighborEvidence,
  NeighborExclusion,
  NeighborRecord,
  NeighborRewardRef,
} from "./types.ts";

export function readRewards(
  content: Catalog,
  neighbors: NeighborRecord[],
  tables: Tables,
): NeighborRewardRef[] {
  const excludedNames = tables
    .rows(profile.roots.neighborsNpc)
    .filter((row) => !isAllowedNeighbor(tables.id(row)))
    .flatMap((row) => {
      const name = tables.text(row, 1);
      return name?.trim() ? [name] : [];
    });
  return content.items.flatMap((item) => {
    if (item.kind !== "item" || (item.category !== "furniture" && item.category !== "clothing"))
      return [];
    const summary = item.attributes.sources;
    if (!summary?.includes("友邻")) return [];
    const relatedNeighborIds = neighbors.filter((n) => summary.includes(n.nameZh)).map((n) => n.id);
    if (!relatedNeighborIds.length && excludedNames.some((name) => summary.includes(name)))
      return [];
    return [
      {
        itemId: item.id,
        itemNameZh: item.name,
        category: item.category,
        kind: item.kind,
        sources: [summary],
        relatedNeighborIds,
      },
    ];
  });
}

function resourceKind(value: string): NeighborAssetRef["kind"] | null {
  if (/NPCBldg/i.test(value)) return "house";
  if (/friend[_ ]?s?[_ ]?star|star[_ ]?friends?/i.test(value)) return "friendStar";
  if (/NpcOutfits/i.test(value)) return "outfit";
  if (/NeighborHub/i.test(value)) return "hub";
  if (/FavourMission/i.test(value)) return "favourMission";
  if (/StoryEnv/i.test(value)) return "storyEnv";
  if (/Effects[/]Npc[/](Reaction|Perform)[/]/i.test(value)) return "reaction";
  return null;
}

export function readAssets(
  tables: Tables,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): NeighborAssetRef[] {
  const assets: NeighborAssetRef[] = [];
  for (const row of tables.rows(profile.roots.neighborAssets)) {
    // Only these two fields are verified string references; other entity fields are scalars.
    assertLayout(tables, row, { template: [6, "string"], prefab: [7, "string"] }, 18);
    for (const field of [6, 7]) {
      const value = normalizedPath(tables.string(row, field));
      if (value === null) continue;
      const kind = resourceKind(value);
      if (kind === null) continue;
      const proof = evidence("assets", value, row, [field]);
      if (/(?:^|[_/ ])(?:test|placeholder)(?:[_/ .]|$)|测试|占位/i.test(value)) {
        exclusions.push({
          kind: "asset",
          key: value,
          reason: "test_or_placeholder",
          sources: [proof.source],
        });
        continue;
      }
      assets.push({ path: value, kind, relatedNeighborIds: [] });
      records.push(proof);
    }
  }
  return assets;
}

export function linkedAssets(database: NeighborDatabase): NeighborAssetRef[] {
  const result: NeighborAssetRef[] = [...database.assets];
  const add = (path: string | null, ids: number[]) => {
    if (path !== null) result.push({ path, kind: "other", relatedNeighborIds: ids });
  };
  for (const n of database.neighbors) {
    add(n.avatarPath, [n.id]);
    add(n.npc2Path, [n.id]);
  }
  for (const s of database.stars)
    for (const p of [s.galaxyModelPath, s.playerModelPath, s.skyModelPath, s.illustrationPath])
      add(p, [s.npcId]);
  for (const s of database.stories)
    for (const p of s.paragraphs) add(p.illustrationPath, [s.npcId]);
  for (const r of database.travelReactions) add(r.reactionAsset, r.npcId === null ? [] : [r.npcId]);
  for (const i of database.encounterIslands) {
    add(i.illustrationPath, i.neighborIds);
    for (const p of i.resourcePaths) add(p, i.neighborIds);
  }
  for (const t of database.furnishingThemes)
    for (const p of [
      t.cardBagPath,
      t.cardBackgroundPath,
      t.cardBackPath,
      t.topicIconPath,
      t.lockedBackgroundPath,
      t.unlockedBackgroundPath,
      t.themePath,
      t.coverPath,
    ])
      add(p, t.neighborIds);
  return result;
}
