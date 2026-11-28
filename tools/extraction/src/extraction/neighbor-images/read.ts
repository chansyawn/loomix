import assert from "node:assert/strict";
import type { NeighborRecord } from "../source/neighbors/types.ts";
import type { Tables } from "../source/decode/tables.ts";
import type { imageCollector } from "../source/images.ts";
import type { IndexedAsset, TableRow } from "../types.ts";
import type { NeighborImageRecords, NeighborImageSlot } from "./model.ts";
import { imageFolders, neighborSprites, spritePath } from "./sprites.ts";

type ImageOwner = Pick<NeighborRecord, "id" | "nameZh"> & {
  house: {
    stages: ReadonlyArray<
      Pick<NonNullable<NeighborRecord["house"]>["stages"][number], "id" | "upgrade">
    >;
  } | null;
};

export function readNeighborImages(
  tables: Tables,
  neighbors: readonly ImageOwner[],
  index: readonly IndexedAsset[],
  locate: ReturnType<typeof imageCollector>["locate"],
): NeighborImageRecords {
  const ids = new Set(neighbors.map(({ id }) => id));
  const sprites = neighborSprites(index, ids);
  const rowConfig = (row: TableRow, field: number) => {
    const reference = tables.string(row, field);
    assert.ok(
      reference,
      `Missing neighbor image configuration ${row.root}:${row.rowOffset}:${field}`,
    );
    return { table: row.root, rowOffset: row.rowOffset, field, reference };
  };
  const avatarConfig = new Map<number, NeighborImageSlot["configuration"]>();
  for (const row of tables.rows(547)) {
    const reference = tables.string(row, 2);
    const match = reference && spritePath(reference).match(/(?:^|\/)img_common_npc_avatar(\d+)$/);
    if (!match || !ids.has(Number(match[1]))) continue;
    const id = Number(match[1]);
    avatarConfig.set(id, [...(avatarConfig.get(id) ?? []), rowConfig(row, 2)]);
  }
  const interiors = tables.byId(420, undefined, ids);
  const blueprintIds = new Set(
    neighbors.flatMap(
      ({ house }) =>
        house?.stages.flatMap(({ upgrade }) => (upgrade ? [upgrade.blueprint.itemId] : [])) ?? [],
    ),
  );
  const itemRows = tables.byId(
    325,
    (row) => [tables.string(row, 4), tables.string(row, 5)],
    blueprintIds,
  );
  const slot = (
    asset: ReturnType<typeof sprites.configured>,
    ownership: NeighborImageSlot["ownership"],
    configuration: NeighborImageSlot["configuration"],
  ): NeighborImageSlot => ({
    resourceName: asset.Name,
    ownership,
    configuration,
    object: locate({
      source: asset.Source,
      pathId: asset.PathID,
      assetType: "Sprite",
      container: asset.Container,
      reference: configuration[0]?.reference ?? asset.Name,
      resourceName: asset.Name,
    }).key,
  });
  return [...neighbors]
    .sort((left, right) => left.id - right.id)
    .map(({ id, nameZh, house }) => {
      const avatar = `${imageFolders.social}/img_common_npc_avatar${String(id).padStart(4, "0")}`;
      const interior = `${imageFolders.interior}/npc_decor_${id}`;
      const avatarRows = avatarConfig.get(id) ?? [];
      for (const config of avatarRows)
        assert.equal(spritePath(config.reference), avatar, `Social avatar path for neighbor ${id}`);
      const interiorRow = interiors.get(id);
      const room = interiorRow ? [rowConfig(interiorRow, 1)] : [];
      if (room.length)
        assert.equal(spritePath(room[0]!.reference), interior, `Interior path for neighbor ${id}`);
      return {
        neighborId: id,
        name: nameZh,
        socialAvatar: slot(sprites.configured(avatar), "asset-name", avatarRows),
        interior: slot(
          sprites.configured(interior),
          interiorRow ? "table-relation" : "asset-name",
          room,
        ),
        blueprints: (house?.stages ?? []).flatMap(({ id: stageId, upgrade }) => {
          if (!upgrade) return [];
          const itemId = upgrade.blueprint.itemId,
            row = itemRows.get(itemId);
          assert.ok(row, `Missing blueprint item ${itemId} for neighbor ${id} stage ${stageId}`);
          const icon = (field: number) => {
            const config = rowConfig(row, field);
            assert.equal(
              spritePath(config.reference).split("/").slice(0, -1).join("/"),
              imageFolders.item,
              `Blueprint icon ${itemId}`,
            );
            return slot(sprites.configured(config.reference), "table-relation", [config]);
          };
          return [{ stageId, itemId, small: icon(4), large: icon(5) }];
        }),
        diary: sprites.diary(id).map(({ kind, sequence, asset }) => ({
          kind,
          sequence,
          ...slot(asset, "asset-name", []),
        })),
      };
    });
}
