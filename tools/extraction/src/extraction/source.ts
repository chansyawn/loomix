import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { profile } from "../profile.ts";
import { repoRoot } from "../paths.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { removeWithin } from "../workflow/fs.ts";
import type { AssetMapAsset } from "../client/asset-map.ts";
import type { ConfigSource as EnvironmentConfigSource } from "../environment/config-source.ts";
import { exportAssets } from "../client/anime-studio/index.ts";
import { ObbReader } from "./decode/obb.ts";
import { decodeTextMap } from "./decode/textmap.ts";
import { indexTables, Tables } from "./decode/tables.ts";
import type { BinDataAsset, ConfigFile, ConfigSource, IndexedAsset } from "./types.ts";

export interface DecodeOptions {
  work: string;
  environment: string;
}

function freezeConfig(environment: string, prepared: string): ConfigSource {
  const source = readJson<EnvironmentConfigSource>(path.join(environment, "config-source.json"));
  const gameRoot = path.resolve(repoRoot, profile.paths.gameRoot);
  const files: ConfigFile[] = source.files.map((file) => {
    const original = path.join(gameRoot, file.path);
    const bytes = fs.readFileSync(original);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== file.sha256) throw new Error(`Config source changed: ${file.path}`);
    const local = path.join(prepared, path.basename(file.path));
    fs.copyFileSync(original, local);
    return {
      file: path.basename(file.path),
      exists: true,
      size: bytes.length,
      md5: file.md5,
      sha256,
      matchesManifest: true,
    };
  });
  const relativeDirectory = path.posix.dirname(source.files[0].path.replaceAll("\\", "/"));
  const config: ConfigSource = {
    dataRevision: source.dataRevision,
    relativeDirectory,
    files,
  };
  writeJson(path.join(prepared, "active-config-source.json"), config);
  return config;
}

async function exportBinData(assets: AssetMapAsset[], work: string): Promise<BinDataAsset[]> {
  const wanted = new Set(Object.values(profile.binData));
  const candidates = assets.filter(
    (asset): asset is AssetMapAsset & { Name: string } =>
      asset.Type === "MiHoYoBinData" && !!asset.Name && wanted.has(asset.Name),
  );
  const selected: BinDataAsset[] = [];
  for (const name of wanted) {
    const variants = candidates.filter((asset) => asset.Name === name);
    const overlay = variants.filter((asset) => /[\\/]Persistent[\\/]/i.test(asset.Source));
    const preferred = overlay.length ? overlay : variants;
    if (preferred.length !== 1) throw new Error(`Missing/ambiguous BinData ${name}`);
    const asset = preferred[0];
    const destination = path.join(work, "bindata", name);
    await exportAssets({
      input: asset.Source,
      output: destination,
      game: profile.animeGame,
      types: ["MiHoYoBinData"],
      names: [`^${name}$`],
      logFile: path.join(work, "logs", `bindata-${name}.log`),
    });
    const file = path.join(destination, "MiHoYoBinData", `${name}.json`);
    readJson(file);
    selected.push({
      ...asset,
      Name: name,
      file: path.relative(work, file).split(path.sep).join("/"),
    });
  }
  writeJson(path.join(work, "bindata-manifest.json"), selected);
  return selected;
}

export async function prepareSource({ work, environment }: DecodeOptions): Promise<void> {
  const prepared = path.join(work, "prepared");
  removeWithin(prepared, work);
  removeWithin(path.join(work, "bindata"), work);
  fs.mkdirSync(prepared, { recursive: true });

  freezeConfig(environment, prepared);
  const reader = new ObbReader(path.join(prepared, "ed.obb"));
  writeJson(path.join(prepared, "obb-table-index.json"), indexTables(reader));
  const textmap = decodeTextMap(reader);
  writeJson(path.join(prepared, "textmap-zh-en.json"), {
    source: `${path.posix.dirname(readJson<EnvironmentConfigSource>(path.join(environment, "config-source.json")).files[0].path)}/ed.obb`,
    rootField: profile.roots.textmap,
    ...textmap,
  });

  const assets = readJson<AssetMapAsset[]>(path.join(environment, "asset-index.json"));
  const textures: IndexedAsset[] = assets
    .filter((asset) => asset.Type === "Texture2D")
    .map((asset) => ({ ...asset, PathID: asset.PathID, Source: asset.Source }));
  const sprites: IndexedAsset[] = assets
    .filter((asset) => asset.Type === "Sprite")
    .map((asset) => ({ ...asset, PathID: asset.PathID, Source: asset.Source }));
  writeJson(path.join(prepared, "textures.json"), textures);
  writeJson(path.join(prepared, "sprites.json"), sprites);

  await exportBinData(assets, work);
}

export function openSource(work: string): Tables {
  return new Tables(path.join(work, "prepared"));
}
