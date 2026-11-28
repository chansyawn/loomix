import assert from "node:assert/strict";
import { profile } from "../profile.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { neighborAllowlist } from "../extraction/source/neighbors/allowlist.ts";
import type { NeighborDatabase } from "../extraction/source/neighbors/schema.ts";
import type { ImageObject } from "../extraction/images/model.ts";
import {
  neighborImageSlots,
  type NeighborImageRecords,
  type NeighborImageSlot,
  type DiaryKind,
} from "../extraction/neighbor-images/model.ts";
import type { IndexedAsset, TableRow } from "../extraction/types.ts";

const expected = profile.expectedNeighborImages;
const normalize = (path: string) =>
  path
    .toLowerCase()
    .replaceAll("\\", "/")
    .replace(/\.png$/, "");
const includesId = (ids: readonly number[], id: number) => ids.includes(id);
type Configuration = NeighborImageSlot["configuration"];

function diarySlots(id: number) {
  const padded = String(id).padStart(4, "0");
  const big = "uisprite/load/bigpic/starbay";
  const atlas = "uisprite/load/starbay/img_starbay_diary_player_003.png";
  const slots: { kind: DiaryKind; sequence: number | null; name: RegExp; location: string }[] = [];
  if (includesId(expected.noDiary, id)) return slots;
  const add = (kind: DiaryKind, stem: string, location: string, sequence: number | null = null) => {
    slots.push({ kind, sequence, location, name: new RegExp(`^${stem}$`, "i") });
  };
  for (const sequence of [1, 2]) {
    add("decoration", `img_starbay_diary_${padded}[a-z]+_00${sequence}`, atlas, sequence);
    add("page", `img_starbay_diary_book_${padded}_0${sequence}`, big, sequence);
  }
  add("share", `img_starbay_diary_share_pic_${padded}`, big);
  add("book-large", `img_starbay_diary_book_pic_big_${padded}`, atlas);
  add("book-small", `img_starbay_diary_book_pic_small_${padded}`, big);
  add("letter", `img_starbay_diary_book_letter_bg_${padded}`, big);
  add("spine", `spine_starbaydiary_${padded}`, "ui/companionstar/starbay/spine");
  if (includesId(expected.diaryText, id))
    add("text", `img_starbay_diary_book_txt_${padded}`, atlas);
  return slots;
}

export function verifyNeighborImages(
  records: NeighborImageRecords,
  database: NeighborDatabase,
  tables: Tables,
  index: readonly IndexedAsset[],
  imageObjects: readonly ImageObject[],
): void {
  const candidates = new Map<string, IndexedAsset[]>();
  for (const asset of index) {
    if (asset.Type !== "Sprite" || !asset.Name || !asset.Container) continue;
    const key = `${normalize(asset.Container)}/${asset.Name.toLowerCase()}`;
    const group = candidates.get(key) ?? [];
    group.push(asset);
    candidates.set(key, group);
  }
  const objects = new Map(imageObjects.map((object) => [object.key, object]));
  const check = (
    slot: NeighborImageSlot,
    location: string,
    ownership: NeighborImageSlot["ownership"],
    configs: Configuration,
  ) => {
    assert.equal(slot.ownership, ownership, slot.resourceName);
    assert.deepEqual(slot.configuration, configs, slot.resourceName);
    const container = location.endsWith(".png") ? location : `${location}/${slot.resourceName}.png`;
    const matches =
      candidates.get(
        `${normalize(profile.assetPrefix + container)}/${slot.resourceName.toLowerCase()}`,
      ) ?? [];
    const overlays = matches.filter(({ Source }) => /\/persistent\//i.test(Source));
    const active = overlays.length ? overlays : matches;
    const asset = active[0];
    assert.ok(
      asset && new Set(active.map((entry) => `${entry.Source}:${entry.PathID}`)).size === 1,
      `Expected unique ${container} member ${slot.resourceName}`,
    );
    assert.equal(slot.resourceName, asset.Name);
    const object = objects.get(slot.object);
    assert.ok(
      object &&
        object.assetType === "Sprite" &&
        object.source === asset.Source &&
        object.container === asset.Container &&
        object.pathId === asset.PathID &&
        object.resourceName === asset.Name,
      `Neighbor image object ${slot.resourceName}`,
    );
  };
  const config = (row: TableRow, field: number) => {
    const reference = tables.string(row, field);
    assert.ok(reference);
    return { table: row.root, rowOffset: row.rowOffset, field, reference };
  };
  assert.deepEqual(
    records.map(({ neighborId, name }) => ({ id: neighborId, name })),
    neighborAllowlist,
  );
  for (const record of records) {
    const { neighborId: id, socialAvatar, interior, blueprints, diary } = record;
    const avatar = `img_common_npc_avatar${String(id).padStart(4, "0")}`;
    const social = "uisprite/load/social";
    assert.equal(socialAvatar.resourceName.toLowerCase(), avatar);
    const avatars = tables
      .rows(547)
      .filter((row) => normalize(tables.string(row, 2) ?? "") === `${social}/${avatar}`);
    assert.equal(avatars.length, includesId(expected.assetOnlyAvatars, id) ? 0 : 1);
    check(
      socialAvatar,
      social,
      "asset-name",
      avatars.map((row) => config(row, 2)),
    );

    const rooms = tables.rows(420).filter((row) => tables.id(row) === id);
    assert.equal(rooms.length, includesId(expected.assetOnlyInteriors, id) ? 0 : 1);
    const roomFolder = "uisprite/load/bigpic/npchousepic";
    assert.equal(interior.resourceName.toLowerCase(), `npc_decor_${id}`);
    for (const row of rooms)
      assert.equal(normalize(config(row, 1).reference), `${roomFolder}/npc_decor_${id}`);
    check(
      interior,
      roomFolder,
      rooms.length ? "table-relation" : "asset-name",
      rooms.map((row) => config(row, 1)),
    );

    const house = database.neighbors.find((neighbor) => neighbor.id === id)?.house;
    assert.ok(house);
    assert.deepEqual(
      blueprints.map(({ stageId, itemId }) => ({ stageId, itemId })),
      house.stages.flatMap((stage) =>
        stage.upgrade ? [{ stageId: stage.id, itemId: stage.upgrade.blueprint.itemId }] : [],
      ),
    );
    for (const { itemId, small, large } of blueprints) {
      const rows = tables.rows(325).filter((row) => tables.id(row) === itemId);
      assert.ok(rows.length);
      for (const [slot, field] of [
        [small, 4],
        [large, 5],
      ] as const) {
        const configs = rows.map((row) => config(row, field));
        for (const entry of configs)
          assert.equal(
            normalize(entry.reference),
            `uisprite/load/item/${slot.resourceName.toLowerCase()}`,
          );
        check(slot, "uisprite/load/item", "table-relation", [configs.at(-1)!]);
      }
    }
    const expectedDiary = diarySlots(id);
    assert.equal(diary.length, expectedDiary.length, `Diary coverage ${id}`);
    for (const entry of expectedDiary) {
      const slot = diary.find(
        (slot) => slot.kind === entry.kind && slot.sequence === entry.sequence,
      );
      assert.ok(slot, `Missing diary ${id}:${entry.kind}:${entry.sequence}`);
      assert.match(slot.resourceName, entry.name);
      check(slot, entry.location, "asset-name", []);
    }
  }
  const slots = neighborImageSlots(records);
  assert.equal(slots.length, expected.slots);
  assert.equal(
    new Set(slots.map((slot) => slot.resourceName.toLowerCase())).size,
    expected.resourceNames,
  );
  assert.equal(
    new Set(
      records.flatMap((record) =>
        record.blueprints.flatMap((bp) => [bp.small.object, bp.large.object]),
      ),
    ).size,
    expected.blueprintResources,
  );
}
