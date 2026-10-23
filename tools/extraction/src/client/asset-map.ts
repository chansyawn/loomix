import fs from "node:fs";
import path from "node:path";
import sax from "sax";
import { repoRoot } from "../paths.ts";

export interface AssetMapAsset {
  Name?: string;
  Container?: string;
  Type: string;
  PathID: string;
  Source: string;
}

const fields = new Set(["Name", "Container", "Type", "PathID", "Source"]);
function isField(name: string): name is keyof AssetMapAsset {
  return fields.has(name);
}

export async function* readAssetMap(file: string): AsyncGenerator<AssetMapAsset> {
  const xml = sax.parser(true);
  xml.onerror = (error) => {
    throw error;
  };
  const pending: AssetMapAsset[] = [];
  let depth = 0;
  let root = false;
  let asset: Partial<AssetMapAsset> | undefined;
  let field: keyof AssetMapAsset | undefined;
  let text = "";
  const seen = new Set<string>();
  xml.onopentag = (tag) => {
    depth++;
    if (depth === 1 && tag.name === "Assets" && !root) root = true;
    else if (depth === 2 && tag.name === "Asset" && root) {
      asset = {};
      seen.clear();
    } else if (depth === 3 && asset && isField(tag.name)) {
      if (seen.has(tag.name)) throw new Error(`Duplicate Asset Map field: ${tag.name}`);
      seen.add(tag.name);
      field = tag.name;
      text = "";
    } else throw new Error(`Unexpected Asset Map element: ${tag.name}`);
  };
  xml.ontext = xml.oncdata = (value) => {
    if (field) text += value;
    else if (value.trim()) throw new Error("Unexpected Asset Map text");
  };
  xml.onclosetag = () => {
    if (depth === 3 && asset && field) {
      // Empty optional fields have always been omitted from the indexed JSON.
      if (text) asset[field] = text;
      field = undefined;
    } else if (depth === 2 && asset) {
      const { Type, PathID, Source } = asset;
      if (!Type || !PathID || !Source) throw new Error("Missing Asset Map Type, PathID or Source");
      pending.push({ ...asset, Type, PathID, Source });
      asset = undefined;
    }
    depth--;
  };
  xml.ondoctype = () => {
    throw new Error("Asset Map must not contain a DOCTYPE");
  };
  for await (const chunk of fs.createReadStream(file, { encoding: "utf8" })) {
    xml.write(chunk);
    yield* pending.splice(0);
  }
  xml.close();
  if (!root) throw new Error("Missing Asset Map Assets root");
  yield* pending;
}

export async function inspectAssetMap(file: string): Promise<{
  assets: number;
  baseSources: number;
  persistentSources: number;
}> {
  let assets = 0,
    baseSources = 0,
    persistentSources = 0;
  for await (const asset of readAssetMap(file)) {
    assets++;
    if (/[\\/]StreamingAssets[\\/]/i.test(asset.Source)) baseSources++;
    if (/[\\/]Persistent[\\/]/i.test(asset.Source)) persistentSources++;
  }
  if (!assets) throw new Error("Incomplete or empty Asset Map");
  return { assets, baseSources, persistentSources };
}

export function resolveAssetSource(source: string, gameRoot: string): string {
  const relative = source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(.*)$/)?.[1];
  if (!relative || relative.split("/").includes("..") || path.isAbsolute(relative))
    throw new Error(`Invalid Asset Map source: ${source}`);
  return path.join(gameRoot, relative);
}

export function preferOverlay<T extends { Source: string }>(variants: T[]): T | undefined {
  return variants.find((asset) => /[\\/]Persistent[\\/]/i.test(asset.Source)) ?? variants[0];
}

export const normalizeAssetPath = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("\\", "/")
    .replace(/\.(png|jpe?g|tga|psd)$/, "");

export interface AssetMapAudit {
  assets: number;
  indexed: number;
  types: Record<string, number>;
  baseSources: number;
  persistentSources: number;
}

const INDEXED_TYPES = new Set(["Texture2D", "Sprite", "MiHoYoBinData"]);

export interface AssetIndexOptions {
  binDataNames?: Set<string>;
}

export async function buildAssetIndex(
  xml: string,
  gameRoot: string,
  options: AssetIndexOptions = {},
): Promise<{ entries: AssetMapAsset[]; audit: AssetMapAudit }> {
  const entries: AssetMapAsset[] = [];
  const types: Record<string, number> = {};
  let assets = 0;
  let baseSources = 0;
  let persistentSources = 0;
  for await (const asset of readAssetMap(xml)) {
    assets++;
    types[asset.Type] = (types[asset.Type] ?? 0) + 1;
    if (/[\\/]StreamingAssets[\\/]/i.test(asset.Source)) baseSources++;
    if (/[\\/]Persistent[\\/]/i.test(asset.Source)) persistentSources++;
    if (!INDEXED_TYPES.has(asset.Type)) continue;
    if (
      asset.Type === "MiHoYoBinData" &&
      options.binDataNames &&
      (!asset.Name || !options.binDataNames.has(asset.Name))
    )
      continue;
    const absolute = resolveAssetSource(asset.Source, gameRoot);
    entries.push({
      ...asset,
      Source: path.relative(repoRoot, absolute).split(path.sep).join("/"),
    });
  }
  const audit = { assets, indexed: entries.length, types, baseSources, persistentSources };
  assertAssetMapCoverage(audit);
  return { entries, audit };
}

export function assertAssetMapCoverage(coverage: {
  assets: number;
  baseSources: number;
  persistentSources: number;
}): void {
  if (!coverage.assets) throw new Error("Incomplete or empty Asset Map");
  if (!coverage.baseSources || !coverage.persistentSources)
    throw new Error("Asset Map must contain base and Persistent resources");
}
