import path from "node:path";
import { catalogSource, profile } from "../../profile.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { Tables } from "../decode/tables.ts";
import type { IndexedAsset } from "../types.ts";
import { extractNeighborBundle } from "./extract.ts";
import type { NeighborExtractionInput } from "./types.ts";
import { loadClientGameplayTags } from "../gameplay-tags/client.ts";

export function neighborInput(work: string): NeighborExtractionInput {
  const tables = new Tables(path.join(work, "prepared"));
  return {
    tables,
    source: { ...catalogSource, manifestId: profile.manifestId },
    assetIndex: readJson<IndexedAsset[]>(path.join(work, "prepared/asset-index.json")),
    tagIndex: loadClientGameplayTags(work, tables).index,
  };
}

export async function buildNeighbors(work: string): Promise<void> {
  const { database, clothing, audit } = extractNeighborBundle(neighborInput(work));
  writeJson(path.join(work, "raw/neighbors.json"), database);
  writeJson(path.join(work, "raw/neighbor-clothing.json"), {
    schemaVersion: 1,
    source: database.source,
    items: clothing,
  });
  writeJson(path.join(work, "neighbor-audit.json"), audit);
  writeJson(path.join(work, "neighbor-exclusions.json"), audit.exclusions);
}
