import assert from "node:assert/strict";
import type { Tables } from "../decode/tables.ts";
import type { NeighborDatabase } from "./types.ts";

export function verifyNeighborDetails(database: NeighborDatabase, tables: Tables): void {
  const accepted = new Set(database.neighbors.map((neighbor) => neighbor.id));
  const tuples = (values: readonly (readonly (string | number | null)[])[]) =>
    values.map((value) => JSON.stringify(value)).sort();
  assert.deepEqual(
    tuples(
      database.neighbors.flatMap((neighbor) =>
        neighbor.house ? [[neighbor.id, neighbor.house.id]] : [],
      ),
    ),
    tuples(
      tables
        .rows(310)
        .filter((row) => accepted.has(tables.uint(row, 2, 0)))
        .map((row) => [tables.uint(row, 2), tables.id(row)]),
    ),
    "Independent NPC/house links",
  );
  const houseIds = new Set(
    database.neighbors.flatMap((neighbor) => (neighbor.house ? [neighbor.house.id] : [])),
  );
  assert.deepEqual(
    tuples(
      database.neighbors.flatMap(
        (neighbor) =>
          neighbor.house?.stages.map((stage) => [
            neighbor.house!.id,
            stage.id,
            stage.level,
            stage.name,
          ]) ?? [],
      ),
    ),
    tuples(
      tables
        .rows(315)
        .filter((row) => houseIds.has(tables.uint(row, 1, 0)))
        .map((row) => [
          tables.uint(row, 1),
          tables.id(row),
          tables.uint(row, 2),
          tables.text(row, 3),
        ]),
    ),
    "Independent house/stage links",
  );
  assert.deepEqual(
    tuples(
      database.neighbors.flatMap((neighbor) =>
        neighbor.abilities.map((ability) => [
          neighbor.id,
          ability.unlockLevel,
          ability.name,
          ability.description,
          ability.icon,
        ]),
      ),
    ),
    tuples(
      tables
        .rows(222)
        .filter((row) => accepted.has(tables.uint(row, 1, 0)))
        .map((row) => [
          tables.uint(row, 1),
          tables.id(row),
          tables.text(row, 3),
          tables.text(row, 4),
          tables.string(row, 2),
        ]),
    ),
    "Independent ability links",
  );
  assert.deepEqual(
    tuples(database.neighbors.map((neighbor) => [neighbor.id, neighbor.signature.cookingRecipeId])),
    tuples(
      tables
        .rows(500)
        .filter((row) => accepted.has(tables.uint(row, 0, 0)))
        .map((row) => [tables.uint(row, 0), tables.uint(row, 2)]),
    ),
    "Independent signature recipe links",
  );
  for (const neighbor of database.neighbors) {
    const row = tables.byId(415).get(neighbor.id)!;
    const month = tables.uint(row, 16),
      day = tables.uint(row, 17);
    assert.deepEqual(
      neighbor.profile.birthday,
      month === null || day === null ? null : { month, day },
      `Birthday ${neighbor.id}`,
    );
    assert.equal(neighbor.profile.gender, tables.string(row, 20));
    assert.deepEqual(
      neighbor.design,
      { furnitureSetId: null, craftingCollectionId: null },
      "Unconfirmed theme namespaces must not create edges",
    );
    for (const stage of neighbor.house?.stages ?? [])
      assert.equal(
        stage.upgradeRequirements,
        null,
        "Unconfirmed quantities must not create requirements",
      );
  }
}
