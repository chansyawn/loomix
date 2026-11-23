import type { Starsea } from "@loomix/schema/starsea";
import { profile } from "../../../profile.ts";
import type { FieldEvidence, EvidenceSource } from "../../evidence/domain-schema.ts";
import type { WithImageUses } from "../../model.ts";
import type { TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";
import type { imageCollector } from "../images.ts";
import { readResourceGroups } from "./resources.ts";

const roots = profile.starsea;

export function readStarsea(
  tables: Tables,
  neighborIds: ReadonlySet<number>,
  images: Pick<ReturnType<typeof imageCollector>, "configured">,
) {
  const rows = (root: number) =>
    [...tables.byId(root).values()].sort((first, second) => tables.id(first) - tables.id(second));
  const localized = (row: TableRow, field: number) => {
    const value = tables.text(row, field);
    if (!value?.trim())
      throw new Error(`Missing starsea text ${row.root}:${tables.id(row)}.${field}`);
    return value;
  };
  const tableSource = (row: TableRow, ...fields: number[]): EvidenceSource => ({
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  });
  const scan = (table: number): EvidenceSource => ({
    kind: "tableScan",
    file: "prepared/ed.obb",
    table,
  });
  const asset = (row: TableRow, field: number) =>
    tables.string(row, field)?.trim().replaceAll("\\", "/") || null;
  const itemIds = (row: TableRow, field: number) => {
    const value = tables.string(row, field);
    if (!value?.trim()) return null;
    const ids = value.split(",").map((token) => {
      const id = Number(token.trim());
      if (!/^\d+$/.test(token.trim()) || !Number.isSafeInteger(id) || id <= 0)
        throw new Error(`Invalid starsea item ID ${tables.id(row)}.${field}: ${token}`);
      return id;
    });
    return [...new Set(ids)];
  };

  const proofs: FieldEvidence[] = [];
  const recordProof = (
    collection: string,
    id: number,
    fieldPath: string,
    sources: EvidenceSource[],
    missing?: string,
  ) => {
    proofs.push({
      entity: { collection, id },
      fieldPath,
      sources,
      status: missing ? "absent" : "confirmed",
      ruleId: "client.starsea.configuration",
      reasonCode: missing ?? null,
    });
  };
  const regionRows = rows(roots.regions);
  const regionIds = new Set(regionRows.map((row) => tables.id(row)));
  const isletRows = rows(roots.islets);
  const allIslets = new Set(isletRows.map((row) => tables.id(row)));
  const excluded = new Set<number>(roots.testIsletIds);
  const assertKnownIslet = (id: number) => {
    if (!allIslets.has(id) || excluded.has(id))
      throw new Error(`Invalid linked starsea islet ${id}`);
  };
  const galaxyRows = tables.byId(roots.galaxies);
  const explorationRows = rows(roots.explorationLists);
  const encounters = tables.rows(roots.encounters).map((row) => {
    const regions = tables.vector(row, 4);
    const islets = tables.vector(row, 3);
    if (!regions?.length || regions.some((id) => !regionIds.has(id)))
      throw new Error(`Invalid starsea encounter regions at ${row.rowOffset}`);
    islets?.forEach(assertKnownIslet);
    return {
      row,
      neighborId: tables.id(row),
      regions,
      islets,
      field1: tables.uint(row, 1),
      field5: tables.vector(row, 5),
    };
  });

  const activeIslets = new Set<number>();
  const regions: WithImageUses<Starsea["regions"]> = regionRows.map((row) => {
    const id = tables.id(row);
    const galaxyId = tables.uint(row, 1);
    const layer = tables.uint(row, 3);
    const galaxy = galaxyRows.get(galaxyId);
    if (!galaxy || layer === null) throw new Error(`Invalid starsea region ${id}`);
    const matching = explorationRows.filter(
      (entry) => tables.uint(entry, 1) === galaxyId && tables.uint(entry, 2) === layer,
    );
    const explorationIsletIds = tables.vector(row, 6);
    const listed = matching.flatMap((entry) => tables.vector(entry, 3) ?? []);
    if (!explorationIsletIds || JSON.stringify(explorationIsletIds) !== JSON.stringify(listed))
      throw new Error(`Conflicting exploration lists for starsea region ${id}`);
    for (const islet of explorationIsletIds) {
      assertKnownIslet(islet);
      activeIslets.add(islet);
    }
    const pool = encounters.filter(
      (entry) => entry.regions.includes(id) && neighborIds.has(entry.neighborId),
    );
    const byNeighbor = new Map<number, typeof pool>();
    for (const entry of pool) {
      const entries = byNeighbor.get(entry.neighborId) ?? [];
      entries.push(entry);
      byNeighbor.set(entry.neighborId, entries);
    }
    const regionEncounters = [...byNeighbor]
      .sort(([first], [second]) => first - second)
      .map(([neighborId, entries]) => {
        const candidateIsletIds = entries.every(
          (entry) => entry.regions.length === 1 && entry.islets !== null,
        )
          ? [...new Set(entries.flatMap((entry) => entry.islets ?? []))]
          : null;
        candidateIsletIds?.forEach((islet) => activeIslets.add(islet));
        return { neighborId, candidateIsletIds };
      });
    const unlockKey = tables.string(row, 9);
    const unlockTip = tables.key(unlockKey);
    if (unlockKey && !unlockTip) throw new Error(`Unresolved starsea unlock tip ${id}`);
    const collection = "starsea.regions";
    recordProof(collection, id, "name", [tableSource(row, 4)]);
    recordProof(collection, id, "galaxyName", [tableSource(row, 1), tableSource(galaxy, 0, 1)]);
    recordProof(
      collection,
      id,
      "unlockTip",
      [tableSource(row, 9)],
      unlockTip ? undefined : "unlock_tip_not_configured",
    );
    recordProof(collection, id, "explorationIsletIds", [
      tableSource(row, 1, 3, 6),
      ...matching.map((entry) => tableSource(entry, 1, 2, 3)),
    ]);
    recordProof(collection, id, "encounters", [
      scan(roots.encounters),
      ...pool.map((entry) => tableSource(entry.row, 0, 3, 4)),
    ]);
    const stationImage = images.configured(
      { kind: "starseaRegion", id, field: "stationImage" },
      asset(row, 13),
      "illustration",
      [tableSource(row, 13)],
    );
    proofs.push({
      entity: { collection, id },
      fieldPath: "mapImage",
      sources: [tableSource(row, 12)],
      status: "unresolved",
      ruleId: "client.starsea.configuration",
      reasonCode: "map_preview_binding_unconfirmed",
    });
    return {
      id,
      name: localized(row, 4),
      galaxyName: localized(galaxy, 1),
      unlockTip,
      mapImage: null,
      stationImage: { use: stationImage },
      explorationIsletIds,
      encounters: regionEncounters,
    };
  });

  const rawIslets = isletRows.map((row) => ({
    id: tables.id(row),
    name: localized(row, 1),
    sceneId: tables.uint(row, 16),
    iconStyleId: tables.uint(row, 17, 0),
    state: tables.string(row, 18),
    condition: tables.string(row, 20),
    internalLabel: tables.string(row, 21),
    field22: tables.uint(row, 22),
    displayedCreatureIds: itemIds(row, 25),
    displayedSpecialtyIds: itemIds(row, 26),
    illustrationPath: asset(row, 27),
    disposition: activeIslets.has(tables.id(row))
      ? "linked"
      : excluded.has(tables.id(row))
        ? "test"
        : "unplaced",
    source: tableSource(row, 0, 1, 16, 17, 18, 20, 21, 22, 25, 26, 27),
  }));
  const islets: WithImageUses<Starsea["islets"]> = rawIslets.flatMap((islet, index) => {
    const { id, name, iconStyleId, displayedCreatureIds, displayedSpecialtyIds } = islet;
    if (!activeIslets.has(id)) return [];
    const row = isletRows[index];
    const collection = "starsea.islets";
    recordProof(collection, id, "name", [tableSource(row, 1)]);
    recordProof(collection, id, "iconStyleId", [tableSource(row, 17)]);
    recordProof(
      collection,
      id,
      "displayedCreatureIds",
      [tableSource(row, 25)],
      displayedCreatureIds ? undefined : "display_list_not_configured",
    );
    recordProof(
      collection,
      id,
      "displayedSpecialtyIds",
      [tableSource(row, 26)],
      displayedSpecialtyIds ? undefined : "display_list_not_configured",
    );
    const use = images.configured(
      { kind: "starseaIslet", id, field: "illustration" },
      islet.illustrationPath,
      "illustration",
      [tableSource(row, 27)],
    );
    return [
      { id, name, iconStyleId, displayedCreatureIds, displayedSpecialtyIds, illustration: { use } },
    ];
  });

  const styleRows = rows(roots.iconStyles);
  const iconStyles: WithImageUses<Starsea["iconStyles"]> = styleRows.map((row) => {
    const id = tables.id(row);
    recordProof("starsea.iconStyles", id, "name", [tableSource(row, 1)]);
    const use = images.configured(
      { kind: "starseaIconStyle", id, field: "icon" },
      asset(row, 2),
      "icon",
      [tableSource(row, 2)],
    );
    return { id, name: localized(row, 1), icon: { use } };
  });
  return {
    data: { regions, islets, iconStyles },
    proofs,
    diagnostics: {
      islets: rawIslets,
      regions: regionRows.map((row) => {
        const sdfPath = asset(row, 12);
        return {
          id: tables.id(row),
          sceneId: tables.uint(row, 5),
          sdfPath,
          mapPreviewCandidate:
            sdfPath?.replace(
              /Img_MaterialStarExplore_(.+)_SDF\.png$/i,
              "Img_StarExplore_Map_$1.png",
            ) ?? null,
          source: tableSource(row, 0, 5, 12, 13),
        };
      }),
      encounters: encounters.map(({ row, ...entry }) => ({
        ...entry,
        disposition: !neighborIds.has(entry.neighborId)
          ? "unlisted_neighbor"
          : entry.regions.length > 1 || entry.islets === null
            ? "region_only"
            : "linked",
        source: tableSource(row, 0, 1, 3, 4, 5),
      })),
      iconStyles: styleRows.map((row) => ({
        id: tables.id(row),
        prefabPath: asset(row, 3),
        variantPath: asset(row, 4),
        source: tableSource(row, 0, 2, 3, 4),
      })),
      ...readResourceGroups(tables, tableSource),
    },
  };
}

export function starseaItemIds(
  islets: Pick<Starsea["islets"][number], "displayedCreatureIds" | "displayedSpecialtyIds">[],
) {
  return islets.flatMap((islet) => [
    ...(islet.displayedCreatureIds ?? []),
    ...(islet.displayedSpecialtyIds ?? []),
  ]);
}
