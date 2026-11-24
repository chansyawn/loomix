import assert from "node:assert/strict";
import type { HairDyeing } from "@loomix/schema/hair-dyeing";
import type { EvidenceSource, FieldEvidence } from "../../evidence/domain-schema.ts";
import type { WithImageUses } from "../../model.ts";
import type { IndexedAsset, Row, TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";
import type { imageCollector } from "../images.ts";
import type { FrozenDyeingJson } from "./inputs.ts";
import { readDyeingInputs } from "./inputs.ts";
import { resolveDyeingIcon } from "./icons.ts";

export interface DyeingObservation {
  data: WithImageUses<HairDyeing>;
  proofs: FieldEvidence[];
}

const ruleTable = 110;
const unlockTable = 111;
const itemTable = 318;
const modes = new Map([
  [1, "full"],
  [2, "partial"],
  [3, "colorful"],
] as const);
const byId = <T extends { id: number }>(entries: T[]) => {
  const map = new Map(entries.map((entry, index) => [entry.id, { entry, index }]));
  assert.equal(map.size, entries.length, "Duplicate palette ID");
  return map;
};
const sortedIds = (ids: Iterable<number>) => [...ids].sort((left, right) => left - right);
const rgba = ({
  r,
  g,
  b,
  a,
}: {
  r: number;
  g: number;
  b: number;
  a: number;
}): [number, number, number, number] => [r, g, b, a];
const table = (row: TableRow, ...fields: number[]): EvidenceSource => ({
  kind: "table",
  file: "prepared/ed.obb",
  table: row.root,
  rowOffset: row.rowOffset,
  fields,
});
const assetJson = <T>(
  { file, source, pathId, sha256 }: FrozenDyeingJson<T>,
  pointer: string,
): EvidenceSource => ({
  kind: "assetJson",
  file,
  source,
  pathId,
  sha256,
  pointer,
});
const token = (tables: Tables, row: Row, field: number) =>
  tables.string(row, field)?.trim() || null;

function amount(tables: Tables, row: TableRow, field: number) {
  const raw = token(tables, row, field);
  if (!raw) return null;
  const match = /^([1-9]\d*)_([1-9]\d*)$/.exec(raw);
  assert.ok(match, `Invalid dyeing material ${tables.id(row)}.${field}`);
  return { itemId: Number(match[1]), quantity: Number(match[2]) };
}

export function dyeMaterialIds(data: {
  colorGroups: readonly Pick<HairDyeing["colorGroups"][number], "unlock">[];
}) {
  return sortedIds(
    new Set(
      data.colorGroups.flatMap(({ unlock }) =>
        [unlock?.unlockCost, unlock?.dyeCost].flatMap((cost) => (cost ? [cost.itemId] : [])),
      ),
    ),
  );
}

export function readHairDyeing(
  source: string,
  tables: Tables,
  index: IndexedAsset[],
  images: ReturnType<typeof imageCollector>,
  hairstyleIds: ReadonlySet<number>,
  flowerIds: ReadonlySet<number>,
): DyeingObservation {
  const inputs = readDyeingInputs(source, index);
  const groupsById = byId(inputs.groups.value.colorGroups);
  const blocksById = byId(inputs.blocks.value.colorBlocks);
  const proofs: FieldEvidence[] = [];
  const prove = (
    collection: keyof HairDyeing,
    id: number,
    fieldPath: string,
    value: unknown,
    sources: EvidenceSource[],
  ) => {
    proofs.push({
      entity: { collection: `hairDyeing.${collection}`, id },
      fieldPath,
      sources,
      status: value === null ? "absent" : "confirmed",
      ruleId: `client.hairDyeing.${collection}`,
      reasonCode: value === null ? "configuration_not_present" : null,
    });
  };
  const icon = (
    kind: "hairColorGroup" | "hairColorBlock",
    id: number,
    reference: string | null,
    source: EvidenceSource,
  ) => ({
    use: images.need(
      { kind, id, field: "icon" },
      reference ? [resolveDyeingIcon(index, reference)] : [],
      "icon",
      [source],
      "image_not_configured",
      !!reference,
    ),
  });

  const groupIds = new Set<number>();
  const blockIds = new Set<number>();
  const hairstyleConfigs = inputs.hairstyles
    .filter(({ value }) => hairstyleIds.has(value.configId))
    .map((input) => {
      const {
        configId: itemId,
        regions,
        regionToColorGroups,
        regionIdToDefaultColor,
      } = input.value;
      const data = regions.map(({ regionId: id, regionName: name }) => {
        const colorGroupIds = regionToColorGroups?.[id] ?? null;
        const defaultColorBlockId = regionIdToDefaultColor?.[id] ?? null;
        for (const groupId of colorGroupIds ?? []) groupIds.add(groupId);
        if (defaultColorBlockId !== null) blockIds.add(defaultColorBlockId);
        return { id, name, colorGroupIds, defaultColorBlockId };
      });
      prove("hairstyleConfigs", itemId, "regions", data, [assetJson(input, "")]);
      return { itemId, regions: data };
    })
    .sort((left, right) => left.itemId - right.itemId);

  const flowerInputs = tables
    .rows(itemTable)
    .filter((row) => flowerIds.has(tables.id(row)))
    .flatMap((row) => {
      const itemId = tables.id(row);
      const colorTags = [
        ...new Set(
          (token(tables, row, 9) ?? "")
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ];
      if (!colorTags.length) return [];
      prove("flowerInputs", itemId, "colorTags", colorTags, [table(row, 0, 9)]);
      return [{ itemId, colorTags }];
    })
    .sort((left, right) => left.itemId - right.itemId);

  const unlocks = tables.byId(unlockTable);
  for (const groupId of unlocks.keys()) if (groupId !== null) groupIds.add(groupId);
  const names = new Map<number, TableRow[]>();
  const flowerRules: HairDyeing["flowerRules"] = [];
  for (const row of tables.rows(ruleTable)) {
    const id = tables.id(row);
    const groupId = tables.uint(row, 2);
    assert.ok(groupId);
    groupIds.add(groupId);
    const rows = names.get(groupId) ?? [];
    rows.push(row);
    names.set(groupId, rows);
    const unlock = unlocks.get(groupId);
    if (!unlock || tables.uint(unlock, 2, 0) !== 1) continue;
    const singleTag = token(tables, row, 4);
    const first = token(tables, row, 5);
    const second = token(tables, row, 6);
    assert.equal(first === null, second === null, `Incomplete dyeing pair ${id}`);
    if (!singleTag && !first) continue;
    const pairTags: [string, string] | null =
      first && second ? (first <= second ? [first, second] : [second, first]) : null;
    flowerRules.push({ id, groupId, outputTag: token(tables, row, 3), singleTag, pairTags });
    prove("flowerRules", id, "$", true, [table(row, 0, 2, 3, 4, 5, 6), table(unlock, 0, 2)]);
  }
  flowerRules.sort((left, right) => left.id - right.id);

  const colorGroups = sortedIds(groupIds).map((id) => {
    const group = groupsById.get(id);
    assert.ok(group, `Unknown dyeing color group ${id}`);
    const pointer = `/colorGroups/${group.index}`;
    const { colorBlockIds, iconPath } = group.entry;
    for (const blockId of colorBlockIds) blockIds.add(blockId);
    const displaySources = [assetJson(inputs.groups, `${pointer}/displayColor`)];
    let displayColor = rgba(group.entry.displayColor);
    if (displayColor[3] === 0 && colorBlockIds.length) {
      const block = blocksById.get(colorBlockIds[0]);
      assert.ok(block, `Unknown first color block for ${id}`);
      displayColor = rgba(block.entry.displayColor);
      displaySources.push(
        assetJson(inputs.groups, `${pointer}/colorBlockIds/0`),
        assetJson(inputs.blocks, `/colorBlocks/${block.index}/displayColor`),
      );
    }
    const rows = names.get(id) ?? [];
    const labels = new Set(rows.map((row) => tables.text(row, 1)));
    assert.ok(labels.size <= 1, `Conflicting dyeing group names for ${id}`);
    const name = [...labels][0] ?? null;
    const labelSources = rows.flatMap((row) => {
      const hash = tables.uint(row, 1);
      const text = hash === null ? undefined : tables.textmap[hash];
      return [
        table(row, 0, 1, 2),
        ...(text?.nameZh
          ? [
              {
                kind: "table" as const,
                file: "prepared/ed.obb",
                table: 1,
                rowOffset: text.rowOffset,
                fields: [1],
              },
            ]
          : []),
      ];
    });
    const row = unlocks.get(id);
    const modeId = row ? tables.uint(row, 4) : null;
    const mode = modeId === 1 || modeId === 2 || modeId === 3 ? modes.get(modeId) : null;
    if (row) assert.ok(mode, `Unknown dyeing mode for ${id}`);
    const unlock =
      row && mode
        ? {
            mode,
            sort: tables.uint(row, 1, 0),
            flowerMatchEnabled: tables.uint(row, 2, 0) === 1,
            unlockCost: amount(tables, row, 3),
            dyeCost: mode === "partial" ? amount(tables, row, 5) : null,
          }
        : null;
    prove("colorGroups", id, "name", name, labelSources);
    prove("colorGroups", id, "colorBlockIds", colorBlockIds, [
      assetJson(inputs.groups, `${pointer}/colorBlockIds`),
    ]);
    prove("colorGroups", id, "displayColor", displayColor, displaySources);
    prove(
      "colorGroups",
      id,
      "unlock",
      unlock,
      row ? [table(row, 0, 1, 2, 3, 4, ...(mode === "partial" ? [5] : []))] : [],
    );
    return {
      id,
      name,
      colorBlockIds,
      displayColor,
      unlock,
      icon: icon("hairColorGroup", id, iconPath, assetJson(inputs.groups, `${pointer}/iconPath`)),
    };
  });
  const colorBlocks = sortedIds(blockIds).map((id) => {
    const block = blocksById.get(id);
    assert.ok(block, `Unknown dyeing color block ${id}`);
    const { entry } = block;
    const pointer = `/colorBlocks/${block.index}`;
    const visualKind = entry.replaceMaterial
      ? ("materialReplacement" as const)
      : entry.type === 1
        ? ("texture" as const)
        : ("tint" as const);
    const displayColor = rgba(entry.displayColor);
    prove("colorBlocks", id, "displayColor", displayColor, [
      assetJson(inputs.blocks, `${pointer}/displayColor`),
    ]);
    prove("colorBlocks", id, "visualKind", visualKind, [assetJson(inputs.blocks, pointer)]);
    return {
      id,
      displayColor,
      visualKind,
      icon: icon(
        "hairColorBlock",
        id,
        entry.iconPath,
        assetJson(inputs.blocks, `${pointer}/iconPath`),
      ),
    };
  });
  return {
    data: { hairstyleConfigs, flowerInputs, flowerRules, colorGroups, colorBlocks },
    proofs,
  };
}
