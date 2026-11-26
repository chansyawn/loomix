import assert from "node:assert/strict";
import { z } from "zod";
import { IdSchema } from "@loomix/schema/common";
import type { HairDyeing } from "@loomix/schema/hair-dyeing";
import type { EvidenceSource, FieldEvidence } from "../../evidence/domain-schema.ts";
import { AssetJsonSourceSchema, TableFieldSourceSchema } from "../../evidence/domain-schema.ts";
import type { WithImageUses } from "../../model.ts";
import type { IndexedAsset, Row, TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";
import type { imageCollector } from "../images.ts";
import type { DyeingInputs, FrozenDyeingJson } from "./inputs.ts";
import { readDyeingInputs } from "./inputs.ts";
import { resolveDyeingIcon } from "./icons.ts";
import { materialProperties, resolveDyeingRegion } from "./regions.ts";

export const dyeingDiagnosticsSchema = z.strictObject({
  hairstyles: z
    .strictObject({
      itemId: IdSchema,
      asset: AssetJsonSourceSchema,
      regions: z
        .strictObject({
          id: IdSchema,
          internalName: z.string(),
          materialProperties: z.string().array(),
          colorGroupIds: IdSchema.array().nullable(),
          defaultColorBlockId: IdSchema.nullable(),
          textHash: z.number().int().positive().nullable(),
        })
        .array(),
    })
    .array(),
  colorGroups: z
    .strictObject({
      id: IdSchema,
      asset: AssetJsonSourceSchema,
      internalName: z.string(),
      colorBlockIds: IdSchema.array(),
      unlock: TableFieldSourceSchema.nullable(),
      nameRows: z
        .strictObject({
          row: TableFieldSourceSchema,
          hash: z.number().int().nonnegative().nullable(),
          name: z.string().nullable(),
          textSource: TableFieldSourceSchema.nullable(),
        })
        .array(),
    })
    .array(),
});

export interface DyeingObservation {
  data: WithImageUses<HairDyeing>;
  proofs: FieldEvidence[];
  diagnostics: z.infer<typeof dyeingDiagnosticsSchema>;
}

const ruleTable = 110;
const unlockTable = 111;
const itemTable = 318;
const modes = new Map<number, HairDyeing["colorGroups"][number]["unlock"]["mode"]>([
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
const table = (row: TableRow, ...fields: number[]) =>
  ({
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  }) as const satisfies z.infer<typeof TableFieldSourceSchema>;
const assetJson = <T>({ file, source, pathId, sha256 }: FrozenDyeingJson<T>, pointer: string) =>
  ({
    kind: "assetJson",
    file,
    source,
    pathId,
    sha256,
    pointer,
  }) as const satisfies z.infer<typeof AssetJsonSourceSchema>;
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
        [unlock.unlockCost, unlock.dyeCost].flatMap((cost) => (cost ? [cost.itemId] : [])),
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
  return observeHairDyeing(
    readDyeingInputs(source, index),
    tables,
    index,
    images,
    hairstyleIds,
    flowerIds,
  );
}

export function observeHairDyeing(
  inputs: DyeingInputs,
  tables: Tables,
  index: IndexedAsset[],
  images: ReturnType<typeof imageCollector>,
  hairstyleIds: ReadonlySet<number>,
  flowerIds: ReadonlySet<number>,
): DyeingObservation {
  const groupsById = byId(inputs.groups.value.colorGroups);
  const blocksById = byId(inputs.blocks.value.colorBlocks);
  const diagnostics: DyeingObservation["diagnostics"] = { hairstyles: [], colorGroups: [] };
  const unlocks = new Map(
    tables.rows(unlockTable).map((row) => {
      const id = tables.id(row);
      const mode = modes.get(tables.uint(row, 4, 0));
      assert.ok(mode && groupsById.has(id), `Invalid dyeing unlock ${id}`);
      const match = tables.uint(row, 2, 0);
      assert.ok(match === 0 || match === 1, `Invalid flower match setting ${id}`);
      return [
        id,
        {
          data: {
            mode,
            sort: tables.uint(row, 1, 0),
            flowerMatchEnabled: match === 1,
            unlockCost: amount(tables, row, 3),
            dyeCost: mode === "partial" ? amount(tables, row, 5) : null,
          },
          source: table(row, 0, 1, 2, 3, 4, ...(mode === "partial" ? [5] : [])),
          flowerMatchSource: table(row, 0, 2),
          modeSource: table(row, 0, 4),
        },
      ] as const;
    }),
  );
  assert.equal(unlocks.size, tables.rows(unlockTable).length, "Duplicate dyeing unlock ID");
  const textMap = (hash: number | null) => {
    const text = hash === null ? undefined : tables.textmap[hash];
    const name = text?.nameZh?.trim() || null;
    return {
      name,
      textSource:
        text && name
          ? {
              kind: "table" as const,
              file: "prepared/ed.obb",
              table: 1,
              rowOffset: text.rowOffset,
              fields: [1],
            }
          : null,
    };
  };
  const proofs: FieldEvidence[] = [];
  const prove = (
    collection: keyof HairDyeing,
    id: number,
    fieldPath: string,
    value: unknown,
    sources: EvidenceSource[],
    reason = "configuration_not_present",
  ) => {
    proofs.push({
      entity: { collection: `hairDyeing.${collection}`, id },
      fieldPath,
      sources,
      status:
        value !== null ? "confirmed" : reason === "textmap_unresolved" ? "unresolved" : "absent",
      ruleId: `client.hairDyeing.${collection}`,
      reasonCode: value === null ? reason : null,
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

  const blockIds = new Set<number>();
  const hairstyleConfigs = inputs.hairstyles
    .flatMap((input) => {
      const {
        configId: itemId,
        regions,
        regionToColorGroups,
        regionIdToDefaultColor,
      } = input.value;
      const published = hairstyleIds.has(itemId);
      const observed: DyeingObservation["diagnostics"]["hairstyles"][number]["regions"] = [];
      const data = regions.flatMap((region, regionIndex) => {
        const { regionId: id, regionName: internalName } = region;
        const originalIds = regionToColorGroups?.[id] ?? null;
        const defaultColorBlockId = regionIdToDefaultColor?.[id] ?? null;
        const properties = materialProperties(region);
        const eligibleGroups = (originalIds ?? []).flatMap((groupId) => {
          assert.ok(groupsById.has(groupId), `Unknown dyeing group ${itemId}:${id}:${groupId}`);
          const unlock = unlocks.get(groupId);
          return unlock ? [{ groupId, unlock }] : [];
        });
        const purpose = published
          ? resolveDyeingRegion(
              itemId,
              id,
              properties,
              regions.length,
              eligibleGroups.map(({ unlock }) => unlock.data.mode),
            )
          : null;
        observed.push({
          id,
          internalName,
          materialProperties: properties.map(({ propertyName }) => propertyName),
          colorGroupIds: originalIds,
          defaultColorBlockId,
          textHash: purpose?.hash ?? null,
        });
        if (!purpose) return [];
        const colorGroupIds =
          originalIds === null ? null : eligibleGroups.map(({ groupId }) => groupId);
        const { name, textSource } = textMap(purpose.hash);
        assert.ok(name && textSource, `Missing dyeing region text ${itemId}:${id}:${purpose.hash}`);

        const field = `regions.${regionIndex}`;
        const regionAsset = assetJson(input, `/regions/${regionIndex}`);
        prove("hairstyleConfigs", itemId, `${field}.name`, name, [
          ...purpose.properties.map(({ pointer }) =>
            assetJson(input, `/regions/${regionIndex}${pointer}`),
          ),
          ...(purpose.legacy
            ? [
                assetJson(input, "/regions"),
                ...eligibleGroups.map(({ unlock }) => unlock.modeSource),
              ]
            : []),
          textSource,
        ]);
        prove(
          "hairstyleConfigs",
          itemId,
          `${field}.colorGroupIds`,
          colorGroupIds,
          originalIds === null
            ? [regionAsset]
            : [
                assetJson(input, `/regionToColorGroups/${id}`),
                { kind: "tableScan", file: "prepared/ed.obb", table: unlockTable },
                ...eligibleGroups.map(({ unlock }) => ({ ...unlock.source, fields: [0] })),
              ],
        );
        prove("hairstyleConfigs", itemId, `${field}.defaultColorBlockId`, defaultColorBlockId, [
          defaultColorBlockId === null
            ? regionAsset
            : assetJson(input, `/regionIdToDefaultColor/${id}`),
        ]);
        if (defaultColorBlockId !== null) blockIds.add(defaultColorBlockId);
        return [{ id, name, colorGroupIds, defaultColorBlockId }];
      });
      diagnostics.hairstyles.push({ itemId, asset: assetJson(input, ""), regions: observed });
      if (!published) return [];
      prove("hairstyleConfigs", itemId, "regions", data, [assetJson(input, "/regions")]);
      return [{ itemId, regions: data }];
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

  const names = new Map<number, TableRow[]>();
  const flowerRules: HairDyeing["flowerRules"] = [];
  for (const row of tables.rows(ruleTable)) {
    const id = tables.id(row);
    const groupId = tables.uint(row, 2);
    assert.ok(groupId);
    const rows = names.get(groupId) ?? [];
    rows.push(row);
    names.set(groupId, rows);
    const unlock = unlocks.get(groupId);
    if (!unlock?.data.flowerMatchEnabled) continue;
    const singleTag = token(tables, row, 4);
    const first = token(tables, row, 5);
    const second = token(tables, row, 6);
    assert.equal(first === null, second === null, `Incomplete dyeing pair ${id}`);
    if (!singleTag && !first) continue;
    const pairTags: [string, string] | null =
      first && second ? (first <= second ? [first, second] : [second, first]) : null;
    flowerRules.push({ id, groupId, outputTag: token(tables, row, 3), singleTag, pairTags });
    prove("flowerRules", id, "$", true, [table(row, 0, 2, 3, 4, 5, 6), unlock.flowerMatchSource]);
  }
  flowerRules.sort((left, right) => left.id - right.id);

  const colorGroups = sortedIds(groupsById.keys()).flatMap((id) => {
    const group = groupsById.get(id)!;
    const pointer = `/colorGroups/${group.index}`;
    const { colorBlockIds, iconPath } = group.entry;
    const unlock = unlocks.get(id);
    const nameRows = (names.get(id) ?? []).map((row) => {
      const hash = tables.uint(row, 1);
      return { row: table(row, 0, 1, 2), hash, ...textMap(hash) };
    });
    diagnostics.colorGroups.push({
      id,
      asset: assetJson(inputs.groups, pointer),
      internalName: group.entry.name,
      colorBlockIds,
      unlock: unlock?.source ?? null,
      nameRows,
    });
    const labels = new Set(nameRows.flatMap(({ name }) => (name === null ? [] : [name])));
    assert.ok(labels.size <= 1, `Conflicting dyeing group names for ${id}`);
    if (!unlock) return [];
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
    const name = [...labels][0] ?? null;
    const labelSources = nameRows.flatMap(({ row, textSource }) =>
      textSource ? [row, textSource] : [row],
    );
    prove(
      "colorGroups",
      id,
      "name",
      name,
      nameRows.length
        ? labelSources
        : [{ kind: "tableScan", file: "prepared/ed.obb", table: ruleTable }],
      nameRows.length ? "textmap_unresolved" : "configuration_not_present",
    );
    prove("colorGroups", id, "colorBlockIds", colorBlockIds, [
      assetJson(inputs.groups, `${pointer}/colorBlockIds`),
    ]);
    prove("colorGroups", id, "displayColor", displayColor, displaySources);
    prove("colorGroups", id, "unlock", unlock.data, [unlock.source]);
    return [
      {
        id,
        name,
        colorBlockIds,
        displayColor,
        unlock: unlock.data,
        icon: icon("hairColorGroup", id, iconPath, assetJson(inputs.groups, `${pointer}/iconPath`)),
      },
    ];
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
    diagnostics,
  };
}
