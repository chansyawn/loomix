import assert from "node:assert/strict";
import type { Dataset } from "@loomix/schema/dataset";
import type { HairDyeing } from "@loomix/schema/hair-dyeing";
import type { EvidenceSource, FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import type { Row, TableRow } from "../extraction/types.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { DyeingInputs, FrozenDyeingJson } from "../extraction/source/hair-dyeing/inputs.ts";
import type { DyeingObservation } from "../extraction/source/hair-dyeing/read.ts";
import { verifyFieldSources } from "./evidence.ts";

const sortedIds = (ids: Iterable<number>) => [...ids].sort((left, right) => left - right);
const orderByItem = (left: { itemId: number }, right: { itemId: number }) =>
  left.itemId - right.itemId;
const rgba = (color: { r: number; g: number; b: number; a: number }) => [
  color.r,
  color.g,
  color.b,
  color.a,
];
const asset = (input: FrozenDyeingJson<unknown>, pointer: string) => ({
  kind: "assetJson" as const,
  file: input.file,
  source: input.source,
  pathId: input.pathId,
  pointer,
  sha256: input.sha256,
});
const rowSource = (row: TableRow, fields: number[]) => ({
  kind: "table" as const,
  file: "prepared/ed.obb",
  table: row.root,
  rowOffset: row.rowOffset,
  fields,
});
const tableScan = (table: number) => ({
  kind: "tableScan" as const,
  file: "prepared/ed.obb",
  table,
});

const baseProperties = new Set([
  "_TintColorHairBase1",
  "_TintColorHairBase2",
  "_TintColorHairBaseShadow",
]);
const partialProperties = new Set([
  "_TintColorHairPartial1",
  "_TintColorHairPartial2",
  "_TintColorHairPartialShadow",
]);
const legacyProperties = new Set(["_TintColorR", "_TintColorG", "_TintColorB", "_TintColorA"]);

function labelAt(tables: Tables, hash: number | null) {
  const row = hash !== null ? tables.textmap[hash] : undefined;
  const name = row?.nameZh?.trim() || null;
  return {
    name,
    textSource: row && name ? rowSource({ root: 1, rowOffset: row.rowOffset }, [1]) : null,
  };
}

type VerifyProof = (
  collection: keyof HairDyeing,
  id: number,
  field: string,
  sources: EvidenceSource[],
  status?: FieldEvidence["status"],
  reason?: string,
) => void;

function verifyHairstyles(
  actual: HairDyeing["hairstyleConfigs"],
  diagnostics: DyeingObservation["diagnostics"]["hairstyles"],
  inputs: DyeingInputs["hairstyles"],
  tables: Tables,
  unlocks: ReadonlyMap<number | null, TableRow>,
  hairstyleIds: ReadonlySet<number>,
  prove: VerifyProof,
) {
  const configs: HairDyeing["hairstyleConfigs"] = [];
  const observed = inputs.map((input) => {
    const config = input.value;
    const itemId = config.configId;
    const published: HairDyeing["hairstyleConfigs"][number]["regions"] = [];
    const regions = config.regions.map((region, index) => {
      const id = region.regionId;
      const originalIds = config.regionToColorGroups?.[id] ?? null;
      const defaultColorBlockId = config.regionIdToDefaultColor?.[id] ?? null;
      const prefix = `/regions/${index}`;
      const properties: [string, string][] = [];
      const materials = [
        [`${prefix}/colorMaterial`, region.colorMaterial] as const,
        ...(region.colorMaterials ?? []).map(
          (material, offset) => [`${prefix}/colorMaterials/${offset}`, material] as const,
        ),
      ];
      for (const [pointer, material] of materials)
        for (const [offset, property] of (material?.matProperties ?? []).entries())
          properties.push([
            property.propertyName,
            `${pointer}/matProperties/${offset}/propertyName`,
          ]);
      const raw = {
        id,
        internalName: region.regionName,
        materialProperties: properties.map(([property]) => property),
        colorGroupIds: originalIds,
        defaultColorBlockId,
      };
      if (!hairstyleIds.has(itemId)) return { ...raw, textHash: null };

      const groupIds = originalIds?.filter((groupId) => unlocks.has(groupId)) ?? null;
      const rows = (groupIds ?? []).map((groupId) => unlocks.get(groupId)!);
      const bases = properties.filter(([property]) => baseProperties.has(property));
      const partials = properties.filter(([property]) => partialProperties.has(property));
      assert.ok(
        !bases.length || !partials.length,
        `Independent mixed dyeing material ${itemId}:${id}`,
      );
      let matches = bases.length ? bases : partials;
      const sources: EvidenceSource[] = [];
      if (!matches.length) {
        matches = properties.filter(([property]) => legacyProperties.has(property));
        assert.ok(
          config.regions.length === 1 &&
            new Set(matches.map(([property]) => property)).size === 4 &&
            rows.length > 0 &&
            rows.every((row) => tables.uint(row, 4) === 1),
          `Independent unknown dyeing material ${itemId}:${id}`,
        );
        sources.push(asset(input, "/regions"), ...rows.map((row) => rowSource(row, [0, 4])));
      }
      const textHash = partials.length ? 2263953777 : 2263953776;
      const { name, textSource } = labelAt(tables, textHash);
      assert.ok(name && textSource, `Independent missing dyeing region text ${itemId}:${id}`);
      const field = `regions.${index}`;
      prove("hairstyleConfigs", itemId, `${field}.name`, [
        ...matches.map(([, pointer]) => asset(input, pointer)),
        ...sources,
        textSource,
      ]);
      prove(
        "hairstyleConfigs",
        itemId,
        `${field}.colorGroupIds`,
        groupIds === null
          ? [asset(input, prefix)]
          : [
              asset(input, `/regionToColorGroups/${id}`),
              tableScan(111),
              ...rows.map((row) => rowSource(row, [0])),
            ],
        groupIds === null ? "absent" : "confirmed",
        groupIds === null ? "configuration_not_present" : undefined,
      );
      prove(
        "hairstyleConfigs",
        itemId,
        `${field}.defaultColorBlockId`,
        [asset(input, defaultColorBlockId === null ? prefix : `/regionIdToDefaultColor/${id}`)],
        defaultColorBlockId === null ? "absent" : "confirmed",
        defaultColorBlockId === null ? "configuration_not_present" : undefined,
      );
      published.push({ id, name, colorGroupIds: groupIds, defaultColorBlockId });
      return { ...raw, textHash };
    });
    if (hairstyleIds.has(itemId)) {
      configs.push({ itemId, regions: published });
      prove("hairstyleConfigs", itemId, "regions", [asset(input, "/regions")]);
    }
    return { itemId, asset: asset(input, ""), regions };
  });
  assert.deepEqual(diagnostics, observed, "Independent raw dyeing region diagnostics");
  assert.deepEqual(
    actual,
    configs.sort(orderByItem),
    "Independent dyeable hairstyle scope and regions",
  );
  return configs;
}

export function verifyHairDyeing(
  dataset: Dataset,
  tables: Tables,
  inputs: DyeingInputs,
  hairstyleIds: ReadonlySet<number>,
  diagnostics: DyeingObservation["diagnostics"],
  fieldEvidence: readonly FieldEvidence[],
): void {
  const { hairDyeing, catalog } = dataset;
  const unlocks = tables.byId(111);
  const ruleRows = tables.rows(110);
  const prove: VerifyProof = (collection, id, field, sources, status, reason) =>
    verifyFieldSources(
      fieldEvidence,
      `hairDyeing.${collection}`,
      id,
      field,
      sources,
      status,
      reason,
    );
  const configs = verifyHairstyles(
    hairDyeing.hairstyleConfigs,
    diagnostics.hairstyles,
    inputs.hairstyles,
    tables,
    unlocks,
    hairstyleIds,
    prove,
  );

  const main = tables.byId(318);
  const flowerInputs = catalog.items
    .flatMap((item) => {
      if (item.kind !== "plant" || item.category !== "花") return [];
      const row = main.get(item.id);
      assert.ok(row);
      const colorTags = [
        ...new Set(
          (tables.string(row, 9) ?? "")
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ];
      if (!colorTags.length) return [];
      prove("flowerInputs", item.id, "colorTags", [rowSource(row, [0, 9])]);
      return [{ itemId: item.id, colorTags }];
    })
    .sort(orderByItem);
  assert.deepEqual(hairDyeing.flowerInputs, flowerInputs, "Independent flower matching inputs");

  const token = (row: Row, field: number) => tables.string(row, field)?.trim() || null;
  const rules = ruleRows.flatMap((row): HairDyeing["flowerRules"] => {
    const groupId = tables.uint(row, 2);
    assert.ok(groupId);
    const unlock = unlocks.get(groupId);
    if (!unlock || tables.uint(unlock, 2) !== 1) return [];
    const [singleTag, first, second] = [4, 5, 6].map((field) => token(row, field));
    assert.equal(
      first === null,
      second === null,
      `Independent incomplete dyeing pair ${tables.id(row)}`,
    );
    const pairTags = first && second ? ([first, second].sort() as [string, string]) : null;
    if (!singleTag && !pairTags) return [];
    const id = tables.id(row);
    prove("flowerRules", id, "$", [rowSource(row, [0, 2, 3, 4, 5, 6]), rowSource(unlock, [0, 2])]);
    return [{ id, groupId, outputTag: token(row, 3), singleTag: singleTag ?? null, pairTags }];
  });
  assert.deepEqual(
    hairDyeing.flowerRules,
    rules.sort((left, right) => left.id - right.id),
    "Independent flower matching rules",
  );

  const blockIds = new Set(
    configs.flatMap(({ regions }) =>
      regions.flatMap(({ defaultColorBlockId }) =>
        defaultColorBlockId === null ? [] : [defaultColorBlockId],
      ),
    ),
  );
  assert.deepEqual(
    hairDyeing.colorGroups.map(({ id }) => id),
    sortedIds(tables.rows(111).map((row) => tables.id(row))),
    "Exact unlocked color groups",
  );
  const sourceBlocks = new Map(
    inputs.blocks.value.colorBlocks.map((entry, index) => [
      entry.id,
      { entry, pointer: `/colorBlocks/${index}` },
    ]),
  );
  const publishedGroups = new Map(hairDyeing.colorGroups.map((group) => [group.id, group]));
  const cost = (row: TableRow, field: number) => {
    const value = token(row, field);
    if (!value) return null;
    const [itemId, quantity] = value.split("_").map(Number);
    assert.ok(itemId && quantity, `Independent dye material ${tables.id(row)}:${field}`);
    return { itemId, quantity };
  };
  const observedGroups = inputs.groups.value.colorGroups.map((raw, index) => {
    const { id, colorBlockIds } = raw;
    const pointer = `/colorGroups/${index}`;
    const nameRows = ruleRows
      .filter((row) => tables.uint(row, 2) === id)
      .map((row) => {
        const hash = tables.uint(row, 1);
        return { row: rowSource(row, [0, 1, 2]), hash, ...labelAt(tables, hash) };
      });
    const unlock = unlocks.get(id);
    const group = publishedGroups.get(id);
    const modeId = tables.uint(unlock, 4, 0);
    const unlockSource = unlock
      ? rowSource(unlock, modeId === 2 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4])
      : null;
    const labels = new Set(nameRows.flatMap(({ name }) => (name ? [name] : [])));
    assert.ok(labels.size <= 1, `Independent conflicting dyeing names ${id}`);
    if (unlock && unlockSource) {
      assert.ok(group, `Missing unlocked palette ${id}`);
      publishedGroups.delete(id);
      const mode = [null, "full", "partial", "colorful"][modeId];
      assert.ok(mode, `Invalid independent unlock mode ${id}`);
      assert.deepEqual(
        group.unlock,
        {
          mode,
          sort: tables.uint(unlock, 1, 0),
          flowerMatchEnabled: tables.uint(unlock, 2, 0) === 1,
          unlockCost: cost(unlock, 3),
          dyeCost: modeId === 2 ? cost(unlock, 5) : null,
        },
        `Independent dye unlock ${id}`,
      );
      prove("colorGroups", id, "unlock", [unlockSource]);
      const name = [...labels][0] ?? null;
      assert.equal(group.name, name, `Independent dyeing group name ${id}`);
      const labelSources = nameRows.flatMap(({ row, textSource }) =>
        textSource ? [row, textSource] : [row],
      );
      prove(
        "colorGroups",
        id,
        "name",
        nameRows.length ? labelSources : [tableScan(110)],
        name ? "confirmed" : nameRows.length ? "unresolved" : "absent",
        name ? undefined : nameRows.length ? "textmap_unresolved" : "configuration_not_present",
      );
      assert.deepEqual(
        group.colorBlockIds,
        colorBlockIds,
        `Independent client color block order ${id}`,
      );
      prove("colorGroups", id, "colorBlockIds", [asset(inputs.groups, `${pointer}/colorBlockIds`)]);
      const first = colorBlockIds[0] === undefined ? undefined : sourceBlocks.get(colorBlockIds[0]);
      const fallback = raw.displayColor.a === 0 ? first : undefined;
      assert.deepEqual(group.displayColor, rgba(fallback?.entry.displayColor ?? raw.displayColor));
      prove("colorGroups", id, "displayColor", [
        asset(inputs.groups, `${pointer}/displayColor`),
        ...(fallback
          ? [
              asset(inputs.groups, `${pointer}/colorBlockIds/0`),
              asset(inputs.blocks, `${fallback.pointer}/displayColor`),
            ]
          : []),
      ]);
      for (const blockId of colorBlockIds) blockIds.add(blockId);
    }
    return {
      id,
      asset: asset(inputs.groups, pointer),
      internalName: raw.name,
      colorBlockIds,
      unlock: unlockSource,
      nameRows,
    };
  });
  assert.equal(publishedGroups.size, 0, "Every unlocked palette has a client asset");
  assert.deepEqual(
    diagnostics.colorGroups,
    observedGroups.sort((left, right) => left.id - right.id),
    "Independent raw color group diagnostics",
  );

  assert.deepEqual(
    hairDyeing.colorBlocks.map(({ id }) => id),
    sortedIds(blockIds),
    "Exact color block closure",
  );
  for (const block of hairDyeing.colorBlocks) {
    const raw = sourceBlocks.get(block.id);
    assert.ok(raw);
    assert.deepEqual(block.displayColor, rgba(raw.entry.displayColor));
    assert.equal(
      block.visualKind,
      raw.entry.replaceMaterial ? "materialReplacement" : raw.entry.type === 1 ? "texture" : "tint",
    );
    prove("colorBlocks", block.id, "displayColor", [
      asset(inputs.blocks, `${raw.pointer}/displayColor`),
    ]);
    prove("colorBlocks", block.id, "visualKind", [asset(inputs.blocks, raw.pointer)]);
  }
}
