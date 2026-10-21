import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { profile, repoRoot } from "./config.mjs";
import { readJson, writeJson, runProcess } from "./io.mjs";
import { exportAssets } from "../../../lib/anime-studio/index.mjs";

export async function prepare(options) {
  const prepared = path.join(options.work, "prepared");
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
      [
        fileURLToPath(new URL(`../../items/scripts/${step}.mjs`, import.meta.url)),
        "--output",
        prepared,
      ],
      path.join(options.work, "logs", `${step}.log`),
    );
  }
  const wanted = new Set(Object.values(profile.binData));
  const candidates = [];
  let asset;
  const unescape = (s) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  for await (const line of readline.createInterface({
    input: fs.createReadStream(path.resolve(repoRoot, profile.paths.assetMap)),
    crlfDelay: Infinity,
  })) {
    if (line.trim() === "<Asset>") asset = {};
    if (!asset) continue;
    const match = line.match(/<(Name|Container|Type|PathID|Source)(?: [^>]*)?>(.*?)<\//);
    if (match) asset[match[1]] = unescape(match[2]);
    if (line.trim() !== "</Asset>") continue;
    if (asset.Type === "MiHoYoBinData" && wanted.has(asset.Name)) {
      const relative = asset.Source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(.*)$/)?.[1];
      if (!relative || relative.split("/").includes(".."))
        throw new Error("Invalid BinData source");
      asset.Source = path.resolve(repoRoot, profile.paths.gameRoot, relative);
      candidates.push(asset);
    }
    asset = null;
  }
  const selected = [];
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
    selected.push({ ...a, file });
  }
  writeJson(path.join(options.work, "bindata-manifest.json"), selected);
}
