import {
  parseIslandDatabase,
  validateIslandCatalog,
  type Island,
  type IslandDatabase,
} from "@loomix/island-schema";
import type { Catalog } from "@loomix/content-schema";
import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../types.ts";
import { profile } from "../../profile.ts";

export interface IslandExtractionInput {
  tables: Tables;
  content: Catalog;
  source: IslandDatabase["source"];
}

export function islandStatus(name: string, state: string | null): Island["status"] {
  if (/placeholder|占位|暂未投放/i.test(`${name} ${state ?? ""}`)) return "placeholder";
  if (/test|测试/i.test(`${name} ${state ?? ""}`)) return "test";
  if (state !== "DEFAULT") return "unconfirmed";
  if (name.includes("邂逅")) return "encounter";
  return "default";
}

export function extractIslandBundle({ tables, content, source }: IslandExtractionInput) {
  const records: {
    collection: string;
    key: number;
    source: { file: string; table: number; rowOffset: number; fields: number[] };
  }[] = [];
  const exclusions: { islandId: number; field: string; value: number | string; reason: string }[] =
    [];
  const catalogReferences: {
    islandId: number;
    field: string;
    itemId: number;
    file: string;
    pointer: string;
  }[] = [];
  const statuses: {
    islandId: number;
    nameZh: string;
    clientState: string | null;
    status: Island["status"];
    publiclyListed: boolean;
  }[] = [];
  const catalogItems = new Map(content.items.map((item, index) => [item.id, { item, index }]));
  const text = (row: TableRow, field: number) => {
    const value = tables.text(row, field);
    if (!value?.trim()) throw new Error(`Unresolved island TextMap ${row.root}.${field}`);
    return value;
  };
  const id = (row: TableRow, field: number) => {
    const value = tables.uint(row, field);
    if (value === null || value <= 0) throw new Error(`Invalid island ID ${row.root}.${field}`);
    return value;
  };
  const assetPath = (row: TableRow, field: number): string | null => {
    const value = tables.string(row, field)?.trim().replaceAll("\\", "/");
    return value || null;
  };
  const requiredAssetPath = (row: TableRow, field: number, label: string): string => {
    const value = assetPath(row, field);
    if (!value) throw new Error(`Missing island asset path ${label}: ${row.root}.${field}`);
    return value;
  };
  const proof = (collection: string, row: TableRow, fields: number[], maxFields: number) => {
    if (tables.fields(row).length > maxFields)
      throw new Error(`Unexpected island table layout ${row.root}`);
    records.push({
      collection,
      key: tables.id(row),
      source: { file: "prepared/ed.obb", table: row.root, rowOffset: row.rowOffset, fields },
    });
  };
  const refs = (
    row: TableRow,
    field: number,
    name: "displayCreatureIds" | "displaySpecialtyIds",
  ) => {
    const value = tables.string(row, field);
    if (value === null || value.trim() === "") return [];
    const raw = value.split(",").map((part) => {
      if (!/^\d+$/.test(part.trim()))
        throw new Error(`Invalid island item list ${tables.id(row)}.${field}`);
      const itemId = Number(part.trim());
      if (!Number.isSafeInteger(itemId) || itemId <= 0)
        throw new Error(`Invalid island item ID ${itemId}`);
      return itemId;
    });
    return [...new Set(raw)]
      .sort((a, b) => a - b)
      .filter((itemId) => {
        const entry = catalogItems.get(itemId);
        if (
          !entry ||
          entry.item.kind !== "item" ||
          (name === "displayCreatureIds" && entry.item.category !== "creatures")
        ) {
          exclusions.push({
            islandId: tables.id(row),
            field: name,
            value: itemId,
            reason: "not_in_current_catalog_scope",
          });
          return false;
        }
        catalogReferences.push({
          islandId: tables.id(row),
          field: name,
          itemId,
          file: "raw/content.json",
          pointer: `/items/${entry.index}`,
        });
        return true;
      });
  };

  const islandIconStyles = tables
    .rows(profile.roots.islandIconStyles)
    .map((row) => {
      proof("islandIconStyles", row, [0, 1, 2, 3, 4], 5);
      return {
        id: tables.id(row),
        nameZh: text(row, 1),
        iconPath: requiredAssetPath(row, 2, "icon"),
        variantIconPath: requiredAssetPath(row, 4, "variant icon"),
        entityPrefabPath: requiredAssetPath(row, 3, "entity prefab"),
      };
    })
    .sort((a, b) => a.id - b.id);
  const regions = tables
    .rows(profile.roots.islandRegions)
    .map((row) => {
      proof("regions", row, [0, 1, 3, 4, 5, 12, 13], 14);
      return {
        id: tables.id(row),
        galaxyId: id(row, 1),
        layerId: id(row, 3),
        nameZh: text(row, 4),
        sceneId: id(row, 5),
        sdfPath: requiredAssetPath(row, 12, "SDF"),
        stationImagePath: requiredAssetPath(row, 13, "station image"),
      };
    })
    .sort((a, b) => a.id - b.id);
  const islands = tables
    .rows(profile.roots.islands)
    .map((row) => {
      proof("islands", row, [0, 1, 16, 17, 18, 21, 22, 25, 26, 27], 28);
      const islandId = tables.id(row);
      const nameZh = text(row, 1);
      const state = tables.string(row, 18);
      const styleId = id(row, 17);
      if (!islandIconStyles.some((style) => style.id === styleId))
        throw new Error(`Unknown island icon style ${styleId}`);
      const creatures = refs(row, 25, "displayCreatureIds");
      const specialties = refs(row, 26, "displaySpecialtyIds");
      const status = islandStatus(nameZh, state);
      statuses.push({
        islandId,
        nameZh,
        clientState: state,
        status,
        publiclyListed: status === "default" || status === "encounter",
      });
      return {
        id: islandId,
        nameZh,
        sceneId: id(row, 16),
        status,
        galaxyId: null,
        regionId: null,
        iconStyleId: styleId,
        illustrationPath: assetPath(row, 27),
        displayCreatureIds: creatures,
        displaySpecialtyIds: specialties,
      };
    })
    .sort((a, b) => a.id - b.id);

  const database = parseIslandDatabase({
    schemaVersion: 1,
    source,
    islands,
    islandIconStyles,
    regions,
  });
  validateIslandCatalog(database, content);
  const count = (selector: (island: Island) => boolean) => islands.filter(selector).length;
  return {
    database,
    audit: {
      schemaVersion: 1,
      source,
      counts: {
        islands: islands.length,
        islandIconStyles: islandIconStyles.length,
        regions: regions.length,
        withIllustration: count((value) => value.illustrationPath !== null),
        withDisplayCreatures: count((value) => value.displayCreatureIds.length > 0),
        withDisplaySpecialties: count((value) => value.displaySpecialtyIds.length > 0),
        default: count((value) => value.status === "default"),
        encounter: count((value) => value.status === "encounter"),
        test: count((value) => value.status === "test"),
        placeholder: count((value) => value.status === "placeholder"),
        unconfirmed: count((value) => value.status === "unconfirmed"),
      },
      fieldCoverage: {
        id: islands.length,
        nameZh: islands.filter((value) => !!value.nameZh).length,
        sceneId: islands.filter((value) => value.sceneId > 0).length,
        galaxyId: islands.filter((value) => value.galaxyId !== null).length,
        regionId: islands.filter((value) => value.regionId !== null).length,
        iconStyleId: islands.filter((value) => value.iconStyleId > 0).length,
        illustrationPath: islands.filter((value) => value.illustrationPath !== null).length,
        displayCreatureIds: islands.filter((value) => value.displayCreatureIds.length > 0).length,
        displaySpecialtyIds: islands.filter((value) => value.displaySpecialtyIds.length > 0).length,
      },
      records,
      statusRule:
        "explicit name markers override DEFAULT; unknown state is unconfirmed; no availability inference",
      statuses: statuses.sort((a, b) => a.islandId - b.islandId),
      unresolvedAssociations: {
        galaxyId: "Table 654 field 22 semantics are not confirmed; no numeric join inferred",
        regionId: "No confirmed island-to-region association; no name-based join inferred",
      },
      exclusions,
      catalogReferences,
    },
  };
}
