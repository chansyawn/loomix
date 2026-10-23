import type { WorkOptions, IndexedAsset, BinDataAsset } from "./types.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { profile, repoRoot } from "./config.ts";
import { readJson, writeJson, removeWithin } from "./io.ts";
import { runProcess } from "../../workflow/process.ts";
import { readAssetMap } from "../../infrastructure/anime-studio/asset-map.ts";
import { exportAssets } from "../../infrastructure/anime-studio/index.ts";

export async function prepare(options: WorkOptions) {
  const prepared = path.join(options.work, "prepared");
  removeWithin(prepared, options.work);
  removeWithin(path.join(options.work, "bindata"), options.work);
  fs.mkdirSync(prepared, { recursive: true });
  for (const step of [
    "select-config-source",
    "inspect-resources",
    "probe-tables",
    "decode-textmap",
    "scan-decoded-tables",
    "decode-cs-index",
  ]) {
    console.log(`  ${step}`);
    await runProcess(
      process.execPath,
      [fileURLToPath(new URL(`./preparation/${step}.ts`, import.meta.url)), "--output", prepared],
      { logFile: path.join(options.work, "logs", `${step}.log`), logMode: "truncate" },
    );
  }
  const sourceFile = path.join(prepared, "active-config-source.json");
  const source = readJson<import("./types.ts").ConfigSource>(sourceFile);
  for (const entry of source.files) {
    const local = path.join(prepared, path.basename(entry.file));
    fs.copyFileSync(entry.file, local);
    entry.file = local;
  }
  writeJson(sourceFile, source);
  const wanted = new Set(Object.values(profile.binData));
  const candidates: IndexedAsset[] = [];
  for await (const asset of readAssetMap(path.resolve(repoRoot, profile.paths.assetMap))) {
    if (asset.Type === "MiHoYoBinData" && asset.Name && wanted.has(asset.Name)) {
      const relative = asset.Source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(.*)$/)?.[1];
      if (!relative || relative.split("/").includes(".."))
        throw new Error("Invalid BinData source");
      asset.Source = path.resolve(repoRoot, profile.paths.gameRoot, relative);
      candidates.push({
        Name: asset.Name,
        Type: asset.Type,
        Container: asset.Container,
        PathID: asset.PathID,
        Source: asset.Source,
      });
    }
  }
  const selected: BinDataAsset[] = [];
  for (const name of wanted) {
    const variants = candidates.filter((a) => a.Name === name);
    const overlay = variants.filter((a) => /[\\/]Persistent[\\/]/i.test(a.Source));
    const preferred = overlay.length ? overlay : variants;
    if (preferred.length !== 1) throw new Error(`Missing/ambiguous BinData ${name}`);
    const a = preferred[0];
    const destination = path.join(options.work, "bindata", name);
    await exportAssets({
      input: a.Source,
      output: destination,
      game: profile.animeGame,
      types: ["MiHoYoBinData"],
      names: [`^${name}$`],
      logFile: path.join(options.work, "logs", `bindata-${name}.log`),
    });
    const file = path.join(destination, "MiHoYoBinData", `${name}.json`);
    readJson(file);
    selected.push({ ...a, Name: name, file });
  }
  writeJson(path.join(options.work, "bindata-manifest.json"), selected);
}
