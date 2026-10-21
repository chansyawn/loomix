import { getPaths, profile } from "./config.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const { out } = getPaths();
const items = JSON.parse(fs.readFileSync(`${out}/resolved-items.json`)).items;
const chosen = new Map();
for (const item of items) {
  const a = item.iconSmall?.matched
    ? item.iconSmall
    : item.iconLarge?.matched
      ? item.iconLarge
      : null;
  if (a) chosen.set(a.source + "|" + a.pathId, a);
}
const groups = new Map();
for (const a of chosen.values()) {
  const group = a.source + "|" + a.assetType;
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(a);
}
fs.mkdirSync(`${out}/catalog/icons`, { recursive: true });
fs.mkdirSync(`${out}/logs`, { recursive: true });
const manifest = [],
  failures = [];
let index = 0;
for (const [, assets] of groups) {
  const { source, assetType } = assets[0];
  const key = crypto.createHash("sha1").update(source).digest("hex").slice(0, 12),
    dest = path.resolve(out, "icon-batch", assetType === "Sprite" ? "exact-sprites" : "", key);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const names =
    "^(?:" + [...new Set(assets.map((x) => x.resourceName))].map(escape).join("|") + ")$";
  const containers =
    "^(?:" + [...new Set(assets.map((x) => x.container))].map(escape).join("|") + ")$";
  const existing = assets.every((a) =>
    fs.existsSync(path.join(dest, assetType, a.resourceName + ".png")),
  );
  if (!existing) {
    const proc = spawnSync(
      getPaths().animeStudio,
      [
        source,
        dest,
        "--game",
        profile.animeGame,
        "--types",
        assetType,
        "--names",
        names,
        "--containers",
        containers,
      ],
      { encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024 },
    );
    fs.writeFileSync(
      `${out}/logs/icon-batch-${key}-${assetType}.log`,
      (proc.stdout ?? "") + (proc.stderr ?? "") + (proc.error?.message ?? ""),
    );
    if (proc.error || proc.status !== 0)
      throw new Error(`AnimeStudio failed: ${source}; ${proc.error?.message ?? proc.status}`);
  }
  for (const asset of assets) {
    const from = path.join(dest, assetType, asset.resourceName + ".png");
    const file =
      "icons/" +
      crypto.createHash("sha1").update(asset.container.toLowerCase()).digest("hex").slice(0, 16) +
      ".png";
    if (!fs.existsSync(from)) {
      failures.push({ ...asset, reason: "CLI did not export expected PNG" });
      continue;
    }
    const bytes = fs.readFileSync(from);
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      failures.push({ ...asset, reason: "Invalid PNG signature" });
      continue;
    }
    fs.copyFileSync(from, `${out}/catalog/${file}`);
    manifest.push({
      reference: asset.reference,
      container: asset.container,
      source: asset.source,
      pathId: asset.pathId,
      assetType,
      file,
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    });
  }
  index++;
  if (index % 10 === 0 || index === groups.size)
    console.log(
      `Packages ${index}/${groups.size}; PNGs ${manifest.length}; failures ${failures.length}`,
    );
}
fs.writeFileSync(`${out}/catalog/icon-manifest.json`, JSON.stringify(manifest, null, 2));
fs.writeFileSync(`${out}/catalog/icon-export-failures.json`, JSON.stringify(failures, null, 2));
console.log(
  JSON.stringify({ selected: chosen.size, exported: manifest.length, failed: failures.length }),
);

if (failures.length) process.exitCode = 1;
