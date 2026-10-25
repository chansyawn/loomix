import crypto from "node:crypto";
import { profile } from "../../profile.ts";
import type { Tables } from "../decode/tables.ts";
import { evidence } from "./adapters.ts";
import {
  assertLayout,
  localized,
  normalizedPath,
  optionalString,
  requiredId,
  requiredText,
} from "./fields.ts";
import type {
  NeighborEncounterIsland,
  NeighborEventTag,
  NeighborEvidence,
  NeighborExclusion,
  NeighborFriendshipRule,
  NeighborFurnishingTheme,
  NeighborRecord,
} from "./types.ts";

export function readIslands(
  tables: Tables,
  records: NeighborEvidence[],
): NeighborEncounterIsland[] {
  const islands: NeighborEncounterIsland[] = [];
  for (const row of tables.rows(profile.roots.neighborIslands)) {
    assertLayout(
      tables,
      row,
      { id: [0, "uint"], name: [1, "text"], scene: [16, "uint"], illustration: [27, "string"] },
      28,
    );
    const name = localized(tables, row, 1);
    if (!name?.includes("邂逅")) continue;
    const id = requiredId(tables, row, 0);
    islands.push({
      id,
      sceneId: requiredId(tables, row, 16),
      nameZh: name,
      galaxyNameZh: null,
      neighborIds: [],
      resourcePaths: [],
      unlockCondition: null,
      illustrationPath: normalizedPath(tables.string(row, 27)),
    });
    records.push(evidence("encounterIslands", String(id), row, [0, 1, 16, 27]));
  }
  return islands;
}

export function readRules(
  tables: Tables,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): NeighborFriendshipRule[] {
  const rules = new Map<string, NeighborFriendshipRule>();
  for (const row of tables.rows(profile.roots.neighborGuide)) {
    assertLayout(
      tables,
      row,
      { id: [1, "uint"], category: [2, "text"], title: [7, "text"], body: [12, "text"] },
      16,
    );
    const category = localized(tables, row, 2);
    if (category !== "友邻交往") continue;
    const titleZh = localized(tables, row, 7);
    const textZh = requiredText(localized(tables, row, 12), `guide:${titleZh ?? ""}`);
    const key = `guide:${crypto
      .createHash("sha256")
      .update(`${titleZh ?? ""}\n${textZh}`)
      .digest("hex")
      .slice(0, 16)}`;
    const proof = evidence("friendshipRules", key, row, [1, 2, 7, 12]);
    if (/\[test\]|暂未投放|占位/i.test(`${titleZh}\n${textZh}`)) {
      exclusions.push({
        kind: "rule",
        key,
        reason: "test_or_placeholder",
        sources: [proof.source],
      });
      continue;
    }
    const plain = textZh.replace(/<[^>]+>/g, "");
    const level = plain.match(/亲密度(?:达到|升级至)(\d+)级/);
    rules.set(key, { key, titleZh, textZh, category, level: level ? Number(level[1]) : null });
    records.push(proof);
  }
  return [...rules.values()];
}

export function readEventTags(tables: Tables, records: NeighborEvidence[]): NeighborEventTag[] {
  return tables.rows(profile.roots.neighborEvents).map((row) => {
    assertLayout(tables, row, { id: [0, "uint"], text: [1, "string"] }, 4);
    const textZh = requiredText(tables.string(row, 1), "event tag");
    const key = `event:${textZh}`;
    records.push(evidence("eventTags", key, row, [0, 1]));
    return { key, textZh };
  });
}

export function readThemes(
  tables: Tables,
  neighbors: NeighborRecord[],
  records: NeighborEvidence[],
): NeighborFurnishingTheme[] {
  const themes: NeighborFurnishingTheme[] = [];
  for (const row of tables.rows(profile.roots.neighborThemes)) {
    assertLayout(
      tables,
      row,
      {
        id: [0, "uint"],
        name: [1, "text"],
        description: [3, "text"],
        bag: [4, "string"],
        background: [5, "string"],
        back: [6, "string"],
        icon: [7, "string"],
        locked: [8, "string"],
        unlocked: [9, "string"],
        theme: [10, "string"],
        cover: [11, "string"],
      },
      12,
    );
    const descriptionZh = localized(tables, row, 3);
    const neighborIds = neighbors
      .filter((n) => descriptionZh?.includes(`完成${n.nameZh}的`))
      .map((n) => n.id);
    if (!neighborIds.length) continue;
    const rawId = tables.uint(row, 0);
    const id = optionalString(tables, row, 0) === null ? rawId : null;
    if (id !== null && id <= 0) throw new Error(`Invalid neighbor furnishing theme ID ${id}`);
    const nameZh = requiredText(localized(tables, row, 1), "furnishing theme");
    const key = `theme:${nameZh}`;
    themes.push({
      id,
      key,
      nameZh,
      neighborIds,
      descriptionZh,
      cardBagPath: normalizedPath(tables.string(row, 4)),
      cardBackgroundPath: normalizedPath(tables.string(row, 5)),
      cardBackPath: normalizedPath(tables.string(row, 6)),
      topicIconPath: normalizedPath(tables.string(row, 7)),
      lockedBackgroundPath: normalizedPath(tables.string(row, 8)),
      unlockedBackgroundPath: normalizedPath(tables.string(row, 9)),
      themePath: normalizedPath(tables.string(row, 10)),
      coverPath: normalizedPath(tables.string(row, 11)),
    });
    records.push(evidence("furnishingThemes", key, row, [0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
  }
  return themes;
}
