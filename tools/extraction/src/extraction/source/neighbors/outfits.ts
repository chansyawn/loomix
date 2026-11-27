import { profile } from "../../../profile.ts";
import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../../types.ts";
import { assertLayout, requiredText } from "./fields.ts";
import type { NeighborEvidence, NeighborExclusion, NeighborOutfit } from "./types.ts";

type OutfitCandidate = Pick<
  NeighborOutfit,
  "id" | "neighborId" | "relationship" | "playerItemId"
> & {
  row: TableRow;
};
type OutfitSlot = { name: string; row: TableRow };

interface OutfitReferences {
  items: Map<number, TableRow>;
  displays: Map<number, TableRow>;
  slots: Map<number, OutfitSlot>;
}

function fieldSource(tables: Tables, row: TableRow, fields: number[]): NeighborEvidence["source"] {
  return {
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields: fields.filter((field) => tables.fields(row)[field] != null),
  };
}

function itemSignature(tables: Tables, row: TableRow) {
  return {
    name: tables.text(row, 1),
    colors: tables.string(row, 9),
    materials: tables.string(row, 11),
    styles: tables.string(row, 12),
    labels: tables.string(row, 13),
  };
}

function displaySignature(tables: Tables, row: TableRow) {
  return {
    smallIcon: tables.string(row, 4),
    largeIcon: tables.string(row, 5),
    description: tables.text(row, 27),
  };
}

function mergeRows(
  tables: Tables,
  root: number,
  ids: ReadonlySet<number>,
  signature: (row: TableRow) => unknown,
): Map<number, TableRow> {
  const result = new Map<number, TableRow>();
  for (const row of tables.rows(root)) {
    const id = tables.uint(row, 0);
    if (id === null || !ids.has(id)) continue;
    const previous = result.get(id);
    if (previous && JSON.stringify(signature(previous)) !== JSON.stringify(signature(row)))
      throw new Error(`Conflicting neighbor outfit reference ${root}:${id}`);
    if (!previous) result.set(id, row);
  }
  return result;
}

function addEvidence(
  records: NeighborEvidence[],
  outfitId: number,
  tables: Tables,
  row: TableRow,
  fields: number[],
): void {
  records.push({
    collection: "outfits",
    key: String(outfitId),
    source: fieldSource(tables, row, fields),
  });
}

function readCandidates(
  tables: Tables,
  acceptedNeighborIds: ReadonlySet<number>,
  exclusions: NeighborExclusion[],
): OutfitCandidate[] {
  const sourceRows = tables.rows(profile.roots.neighborOutfits);
  const candidates: OutfitCandidate[] = [];
  const seenIds = new Set<number>();

  for (const row of sourceRows) {
    assertLayout(
      tables,
      row,
      {
        id: [0, "uint"],
        neighborId: [1, "uint"],
        slot: [2, "uint"],
        smallModel: [7, "string"],
        mediumModel: [8, "string"],
        largeModel: [9, "string"],
        unusedFlag: [10, "byte"],
        playerItem: [11, "uint"],
      },
      12,
    );
    const id = tables.id(row);
    if (seenIds.has(id)) throw new Error(`Duplicate neighbor outfit ${id}`);
    seenIds.add(id);

    const rawNeighborId = tables.uint(row, 1);
    const playerItemId = tables.uint(row, 11);
    const neighborId =
      rawNeighborId !== null && acceptedNeighborIds.has(rawNeighborId) ? rawNeighborId : null;
    // 仅在存在明确对应项时，才将百万区间判定为匹配。
    const matching = id >= 1_000_000 && playerItemId !== null;

    if (rawNeighborId !== null && !acceptedNeighborIds.has(rawNeighborId)) {
      exclusions.push({
        kind: "outfit",
        key: String(id),
        reason: "not_in_allowlist",
        sources: [fieldSource(tables, row, [0, 1])],
      });
      continue;
    }

    if (!matching && neighborId === null) {
      exclusions.push({
        kind: "outfit",
        key: String(id),
        reason:
          id >= 1_000_000
            ? "missing_explicit_player_counterpart"
            : "unconfirmed_neighbor_association",
        sources: [fieldSource(tables, row, [0, 1, 11])],
      });
      continue;
    }

    candidates.push({
      row,
      id,
      neighborId,
      relationship: matching ? "matching" : "neighbor-specific",
      playerItemId,
    });
  }

  return candidates;
}

function readSlots(tables: Tables): Map<number, OutfitSlot> {
  const slots = new Map<number, OutfitSlot>();
  for (const row of tables.rows(profile.roots.neighborOutfitSlots)) {
    assertLayout(tables, row, { id: [0, "uint"], name: [4, "text"] }, 5);
    const id = tables.id(row);
    const name = requiredText(tables.text(row, 4), `neighbor outfit slot:${id}`);
    if (slots.has(id)) throw new Error(`Duplicate neighbor outfit slot ${id}`);
    slots.set(id, { name, row });
  }
  return slots;
}

function buildOutfit(
  tables: Tables,
  { row, id, neighborId, relationship, playerItemId }: OutfitCandidate,
  references: OutfitReferences,
  records: NeighborEvidence[],
): NeighborOutfit {
  const item = references.items.get(id);
  const display = references.displays.get(id);
  if (!item || !display) throw new Error(`Missing neighbor outfit item/display ${id}`);
  const nameZh = requiredText(tables.text(item, 1), `neighbor outfit name:${id}`);
  const slotCode = tables.uint(row, 2);
  if (slotCode === null) throw new Error(`Missing neighbor outfit slot ${id}`);
  const slot = references.slots.get(Math.floor(slotCode / 1_000));
  if (!slot) throw new Error(`Unknown neighbor outfit slot ${id}/${slotCode}`);
  const slotNameZh = slot.name;
  const imagePath = [5, 4]
    .map((field) => tables.string(display, field))
    .find((reference) => reference?.trim());
  if (!imagePath) throw new Error(`Missing neighbor outfit icon ${id}`);
  // 只有配置了模型的体型才能穿戴该服饰。
  const bodyTypes = (["small", "medium", "big"] as const).filter((_, index) =>
    Boolean(tables.string(row, 7 + index)),
  );
  if (!bodyTypes.length) throw new Error(`Missing neighbor outfit models ${id}`);

  addEvidence(records, id, tables, row, [0, 1, 2, 7, 8, 9, 11]);
  addEvidence(records, id, tables, slot.row, [0, 4]);
  addEvidence(records, id, tables, item, [0, 1, 2, 6, 7, 9, 11, 12, 13]);
  addEvidence(records, id, tables, display, [0, 4, 5, 27]);
  const playerItem = playerItemId === null ? undefined : references.items.get(playerItemId);
  if (playerItem) addEvidence(records, id, tables, playerItem, [0, 1]);

  return {
    id,
    nameZh,
    relationship,
    neighborId,
    slotNameZh,
    bodyTypes,
    playerItemId,
    imagePath,
    descriptionZh: tables.text(display, 27),
  };
}

export function readNeighborOutfits(
  tables: Tables,
  acceptedNeighborIds: ReadonlySet<number>,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): { value: NeighborOutfit; sources: NeighborEvidence["source"][] }[] {
  const candidates = readCandidates(tables, acceptedNeighborIds, exclusions);
  const outfitIds = new Set(candidates.map(({ id }) => id));
  const playerIds = candidates.flatMap(({ playerItemId }) =>
    playerItemId === null ? [] : [playerItemId],
  );
  const references: OutfitReferences = {
    items: mergeRows(tables, profile.roots.items, new Set([...outfitIds, ...playerIds]), (row) =>
      itemSignature(tables, row),
    ),
    displays: mergeRows(tables, profile.roots.ui, outfitIds, (row) =>
      displaySignature(tables, row),
    ),
    slots: readSlots(tables),
  };

  return candidates
    .map((candidate) => ({
      value: buildOutfit(tables, candidate, references, records),
      sources: records
        .filter((record) => record.collection === "outfits" && record.key === String(candidate.id))
        .map((record) => record.source),
    }))
    .sort((a, b) => a.value.id - b.value.id);
}
