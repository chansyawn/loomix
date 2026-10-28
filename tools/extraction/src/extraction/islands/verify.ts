import assert from "node:assert/strict";
import { parseIslandDatabase } from "./schema.ts";
import { profile } from "../../profile.ts";
import { extractIslandBundle, type IslandExtractionInput } from "./extract.ts";

export function verifyIslands(value: unknown, input: IslandExtractionInput) {
  const database = parseIslandDatabase(value);
  const expected = extractIslandBundle(input);
  assert.deepEqual(database, expected.database, "Island database differs from frozen sources");
  if (
    database.source.gameVersion === profile.gameVersion &&
    database.source.dataRevision === profile.dataRevision &&
    database.source.resourceRevision === profile.resourceRevision &&
    database.source.manifestId === profile.manifestId
  )
    assert.deepEqual(
      {
        islands: database.islands.length,
        islandIconStyles: database.islandIconStyles.length,
        regions: database.regions.length,
      },
      profile.expectedIslands,
    );
  return database;
}
