import type { CatalogEntryRow } from "../omnidex/catalog";

export type ClothingCounterpart =
  | { kind: "pair"; playerId: number; neighborId: number }
  | { kind: "player-link"; playerId: number };

export function clothingCounterpart(
  byId: ReadonlyMap<number, CatalogEntryRow>,
  currentId: number,
): ClothingCounterpart | null {
  const current = byId.get(currentId)?.record;
  if (!current || !("kind" in current)) return null;
  if (current.kind !== "clothing" && current.kind !== "neighborOutfit") return null;

  const playerId = current.kind === "clothing" ? current.id : current.playerItemId;
  if (playerId === null) return null;
  const player = byId.get(playerId)?.record;
  if (!player || !("kind" in player) || player.kind !== "clothing") return null;

  let neighborId: number | null = null;
  for (const { record } of byId.values()) {
    if (!("kind" in record) || record.kind !== "neighborOutfit" || record.playerItemId !== playerId)
      continue;
    if (neighborId !== null)
      return current.kind === "neighborOutfit" ? { kind: "player-link", playerId } : null;
    neighborId = record.id;
  }
  return neighborId === null ? null : { kind: "pair", playerId, neighborId };
}
