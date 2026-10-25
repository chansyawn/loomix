import path from "node:path";
import { catalogSource, profile } from "../../profile.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { Tables } from "../decode/tables.ts";
import { parseRawContent } from "../schemas/raw-content.ts";
import type { IndexedAsset } from "../types.ts";
import { extractNeighborBundle } from "./extract.ts";
import type { NeighborExtractionInput } from "./types.ts";

export function neighborInput(work: string): NeighborExtractionInput {
  return {
    tables: new Tables(path.join(work, "prepared")),
    content: parseRawContent(readJson(path.join(work, "raw/content.json"))),
    source: { ...catalogSource, manifestId: profile.manifestId },
    assetIndex: readJson<IndexedAsset[]>(path.join(work, "prepared/asset-index.json")),
  };
}

export async function buildNeighbors(work: string): Promise<void> {
  const { database, audit } = extractNeighborBundle(neighborInput(work));
  writeJson(path.join(work, "raw/neighbors.json"), database);
  writeJson(path.join(work, "neighbor-audit.json"), audit);
  writeJson(path.join(work, "neighbor-exclusions.json"), audit.exclusions);
}
