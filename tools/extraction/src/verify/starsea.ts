import assert from "node:assert/strict";
import type { Dataset } from "@loomix/schema/dataset";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";
import type { ClientReadRecords } from "../extraction/model.ts";

export function verifyStarseaSources(
  { starsea, neighbors }: Dataset,
  observed: ClientReadRecords["starsea"]["diagnostics"],
  tables: Tables,
) {
  const byId = (root: number) =>
    [...tables.rows(root)].sort((first, second) => tables.id(first) - tables.id(second));
  const text = (row: TableRow, field: number) => tables.text(row, field);
  const vector = (row: TableRow, field: number) => tables.vector(row, field);
  const npcPool = tables.rows(653);
  const listedNeighbors = new Set(neighbors.neighbors.map((entry) => entry.id));
  const explorerRows = byId(651);
  const linkedIslets = new Set<number>();
  const expectedRegions = byId(652).map((row) => {
    const id = tables.id(row);
    const galaxyId = tables.uint(row, 1);
    const galaxy = tables.rows(650).find((entry) => tables.id(entry) === galaxyId);
    assert.ok(galaxy, `Independent region galaxy ${id}`);
    const explorationIsletIds = vector(row, 6);
    assert.ok(explorationIsletIds, `Independent region exploration ${id}`);
    const fromExplorationTable = explorerRows
      .filter(
        (entry) =>
          tables.uint(entry, 1) === galaxyId && tables.uint(entry, 2) === tables.uint(row, 3),
      )
      .flatMap((entry) => vector(entry, 3) ?? []);
    assert.deepEqual(
      explorationIsletIds,
      fromExplorationTable,
      `Independent region exploration order ${id}`,
    );
    explorationIsletIds.forEach((islet) => linkedIslets.add(islet));
    const encounters = [];
    for (const neighborId of [...listedNeighbors].sort((first, second) => first - second)) {
      const matching = npcPool.filter(
        (entry) => tables.id(entry) === neighborId && vector(entry, 4)?.includes(id),
      );
      if (!matching.length) continue;
      const candidates = new Set<number>();
      let resolved = true;
      for (const entry of matching) {
        const islets = vector(entry, 3);
        if (!islets || vector(entry, 4)?.length !== 1) {
          resolved = false;
          continue;
        }
        for (const isletId of islets) {
          const islet = tables.rows(654).find((candidate) => tables.id(candidate) === isletId);
          assert.ok(
            islet && tables.uint(islet, 17) === 10,
            `Independent encounter NPC islet ${isletId}`,
          );
          candidates.add(isletId);
        }
      }
      if (resolved) for (const isletId of candidates) linkedIslets.add(isletId);
      encounters.push({ neighborId, candidateIsletIds: resolved ? [...candidates] : null });
    }
    return {
      id,
      name: text(row, 4),
      galaxyName: text(galaxy, 1),
      unlockTip: tables.key(tables.string(row, 9)),
      explorationIsletIds,
      encounters,
    };
  });
  assert.deepEqual(
    starsea.regions.map(({ stationImage: _station, mapImage, ...region }) => {
      assert.equal(mapImage, null, "No independently confirmed map preview binding");
      return region;
    }),
    expectedRegions,
    "Independent starsea region and encounter configuration",
  );
  const isletRows = byId(654);
  assert.deepEqual(
    observed.islets.map(({ id }) => id),
    isletRows.map((row) => tables.id(row)),
    "Complete islet observations",
  );
  const readDisplayList = (row: TableRow, field: number) => {
    const raw = tables.string(row, field);
    return raw?.trim() ? Array.from(new Set(raw.split(",").map(Number))) : null;
  };
  assert.deepEqual(
    starsea.islets.map(({ illustration: _illustration, ...islet }) => islet),
    isletRows
      .filter((row) => linkedIslets.has(tables.id(row)))
      .map((row) => ({
        id: tables.id(row),
        name: text(row, 1),
        iconStyleId: tables.uint(row, 17),
        displayedCreatureIds: readDisplayList(row, 25),
        displayedSpecialtyIds: readDisplayList(row, 26),
      })),
    "Independent starsea islets and display lists",
  );
  assert.deepEqual(
    starsea.iconStyles.map(({ icon: _icon, ...style }) => style),
    byId(628).map((row) => ({ id: tables.id(row), name: text(row, 1) })),
    "Independent starsea icon styles",
  );
  const rawResources = tables.rows(655).map((row) => ({
    id: tables.id(row),
    field1: tables.uint(row, 1),
    field2: tables.uint(row, 2),
    mappings: tables
      .string(row, 3)
      ?.split(",")
      .map((pair) => {
        const [label, id] = pair.split(":");
        return { label, dropGroupId: Number(id) };
      }),
  }));
  assert.deepEqual(
    observed.resourceProfiles.map(({ source: _source, ...entry }) => entry),
    rawResources,
    "Independent starsea resource mappings",
  );
  const groupIds = [
    ...new Set(
      rawResources.flatMap((row) => row.mappings?.map((entry) => entry.dropGroupId) ?? []),
    ),
  ].sort((first, second) => first - second);
  const items = tables.byId(318, (row) => text(row, 1));
  assert.deepEqual(
    observed.resourceGroups.map((group) => ({
      id: group.id,
      entries: group.entries.map(({ source: _source, ...entry }) => entry),
    })),
    groupIds.map((id) => ({
      id,
      entries: tables
        .rows(563)
        .filter((row) => tables.id(row) === id)
        .map((row) => ({
          itemId: tables.uint(row, 2),
          name: tables.text(items.get(tables.uint(row, 2)), 1),
          field4: tables.uint(row, 4),
          field5: tables.uint(row, 5),
        })),
    })),
    "Independent starsea drop groups",
  );
}
