import assert from "node:assert/strict";
import type { Dataset } from "@loomix/schema/dataset";
import type { HairDyeing } from "@loomix/schema/hair-dyeing";
import type { IndexedAsset, Row } from "../extraction/types.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { readDyeingInputs } from "../extraction/source/hair-dyeing/inputs.ts";

const sortedIds = (ids: Iterable<number>) => [...ids].sort((left, right) => left - right);
const orderByItem = (left: { itemId: number }, right: { itemId: number }) =>
  left.itemId - right.itemId;
const rgba = (color: { r: number; g: number; b: number; a: number }) => [
  color.r,
  color.g,
  color.b,
  color.a,
];

export function verifyHairDyeing(
  dataset: Dataset,
  tables: Tables,
  source: string,
  index: IndexedAsset[],
): void {
  const { hairDyeing, catalog } = dataset;
  const { hairstyles, groups, blocks } = readDyeingInputs(source, index);
  const main = tables.byId(318);
  const formal = new Map(catalog.items.map((item) => [item.id, item]));
  const actualHairstyles = hairstyles
    .flatMap(({ value: config }) => {
      const item = formal.get(config.configId);
      if (item?.kind !== "appearance" || item.category !== "发型") return [];
      return [
        {
          itemId: item.id,
          regions: config.regions.map((region) => ({
            id: region.regionId,
            name: region.regionName,
            colorGroupIds: config.regionToColorGroups?.[region.regionId] ?? null,
            defaultColorBlockId: config.regionIdToDefaultColor?.[region.regionId] ?? null,
          })),
        },
      ];
    })
    .sort(orderByItem);
  assert.deepEqual(
    hairDyeing.hairstyleConfigs,
    actualHairstyles,
    "Independent dyeable hairstyle scope and regions",
  );

  const flowerInputs = catalog.items
    .flatMap((item) => {
      if (item.kind !== "plant" || item.category !== "花") return [];
      const raw = tables.string(main.get(item.id), 9);
      const colorTags = [
        ...new Set(
          (raw ?? "")
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ];
      return colorTags.length ? [{ itemId: item.id, colorTags }] : [];
    })
    .sort(orderByItem);
  assert.deepEqual(hairDyeing.flowerInputs, flowerInputs, "Independent flower matching inputs");

  const ruleRows = tables.rows(110);
  const unlockRows = tables.byId(111);
  const text = (row: Row, field: number) => tables.string(row, field)?.trim() || null;
  const rules: HairDyeing["flowerRules"] = [];
  const groupIds = new Set<number>();
  for (const { regions } of actualHairstyles)
    for (const region of regions) for (const id of region.colorGroupIds ?? []) groupIds.add(id);
  for (const row of unlockRows.values()) groupIds.add(tables.id(row));
  for (const row of ruleRows) {
    const groupId = tables.uint(row, 2);
    assert.ok(groupId);
    groupIds.add(groupId);
    if (tables.uint(unlockRows.get(groupId), 2) !== 1) continue;
    const singleTag = text(row, 4);
    const first = text(row, 5);
    const second = text(row, 6);
    const pairTags = first && second ? ([first, second].sort() as [string, string]) : null;
    if (singleTag || pairTags)
      rules.push({ id: tables.id(row), groupId, outputTag: text(row, 3), singleTag, pairTags });
  }
  assert.deepEqual(
    hairDyeing.flowerRules,
    rules.sort((left, right) => left.id - right.id),
    "Independent flower matching rules",
  );

  assert.deepEqual(
    hairDyeing.colorGroups.map(({ id }) => id),
    sortedIds(groupIds),
    "Exact color group closure",
  );
  const blockIds = new Set<number>();
  for (const { regions } of actualHairstyles)
    for (const { defaultColorBlockId } of regions)
      if (defaultColorBlockId !== null) blockIds.add(defaultColorBlockId);
  const sourceGroups = new Map(groups.value.colorGroups.map((entry) => [entry.id, entry]));
  const sourceBlocks = new Map(blocks.value.colorBlocks.map((entry) => [entry.id, entry]));
  const cost = (row: Row, field: number) => {
    const value = text(row, field);
    if (!value) return null;
    const [itemId, quantity] = value.split("_").map(Number);
    return { itemId, quantity };
  };
  for (const group of hairDyeing.colorGroups) {
    const raw = sourceGroups.get(group.id);
    assert.ok(raw);
    assert.deepEqual(group.colorBlockIds, raw.colorBlockIds, "Client color block order");
    for (const id of raw.colorBlockIds) blockIds.add(id);
    const first = sourceBlocks.get(raw.colorBlockIds[0]);
    assert.deepEqual(
      group.displayColor,
      rgba(raw.displayColor.a === 0 && first ? first.displayColor : raw.displayColor),
    );
    const names = new Set(
      ruleRows.filter((row) => tables.uint(row, 2) === group.id).map((row) => tables.text(row, 1)),
    );
    assert.deepEqual([...names], names.size ? [group.name] : []);
    if (!names.size) assert.equal(group.name, null);
    const row = unlockRows.get(group.id);
    const mode = tables.uint(row, 4);
    assert.deepEqual(
      group.unlock,
      row
        ? {
            mode: [null, "full", "partial", "colorful"][mode ?? 0],
            sort: tables.uint(row, 1, 0),
            flowerMatchEnabled: tables.uint(row, 2) === 1,
            unlockCost: cost(row, 3),
            dyeCost: mode === 2 ? cost(row, 5) : null,
          }
        : null,
      `Independent dye unlock ${group.id}`,
    );
  }
  assert.deepEqual(
    hairDyeing.colorBlocks.map(({ id }) => id),
    sortedIds(blockIds),
    "Exact color block closure",
  );
  for (const block of hairDyeing.colorBlocks) {
    const raw = sourceBlocks.get(block.id);
    assert.ok(raw);
    assert.deepEqual(block.displayColor, rgba(raw.displayColor));
    assert.equal(
      block.visualKind,
      raw.replaceMaterial ? "materialReplacement" : raw.type === 1 ? "texture" : "tint",
    );
  }
}
