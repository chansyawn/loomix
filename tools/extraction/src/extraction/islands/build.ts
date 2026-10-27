import path from "node:path";
import { catalogSource, profile } from "../../profile.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { Tables } from "../decode/tables.ts";
import { parseRawContent } from "../schemas/raw-content.ts";
import { extractIslandBundle } from "./extract.ts";

export function islandInput(work: string) {
  return {
    tables: new Tables(path.join(work, "prepared")),
    content: parseRawContent(readJson(path.join(work, "raw/content.json"))),
    source: { ...catalogSource, manifestId: profile.manifestId },
  };
}

export function buildIslands(work: string): void {
  const input = islandInput(work);
  const result = extractIslandBundle(input);
  writeJson(path.join(work, "raw/islands.json"), result.database);
  writeJson(path.join(work, "island-audit.json"), result.audit);
  writeJson(path.join(work, "island-exclusions.json"), result.audit.exclusions);
}
