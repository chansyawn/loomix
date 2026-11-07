import { readIslandTable } from "../../source/client/islands.ts";
import crypto from "node:crypto";
import { profile } from "../../profile.ts";
import type { Tables } from "../decode/tables.ts";
import { evidence } from "./adapters.ts";
import { assertLayout, localized, requiredText } from "./fields.ts";
import type {
  NeighborEncounterIsland,
  NeighborEventTag,
  NeighborEvidence,
  NeighborExclusion,
  NeighborFriendshipRule,
} from "./types.ts";

export function readIslands(
  tables: Tables,
  records: NeighborEvidence[],
): NeighborEncounterIsland[] {
  const islands: NeighborEncounterIsland[] = [];
  for (const { row, id, name, sceneId, illustration } of readIslandTable(tables)) {
    if (!name.includes("邂逅")) continue;
    islands.push({
      id,
      sceneId,
      nameZh: name,
      galaxyNameZh: null,
      neighborIds: [],
      resourcePaths: [],
      unlockCondition: null,
      illustrationPath: illustration,
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
