import { getPaths } from "./config.mjs";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const { out, assetMap: xml } = getPaths();
fs.mkdirSync(out, { recursive: true });
const types = {},
  candidates = [],
  textAssets = [],
  icons = [],
  textures = [],
  sprites = [];
let asset,
  count = 0;
const remapSource = (source) => {
  const m = source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(.*)$/);
  if (!m) throw new Error(`Unrecognized Asset Map source: ${source}`);
  return path.join(getPaths().gameRoot, m[1]);
};
const unescape = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
for await (const line of readline.createInterface({
  input: fs.createReadStream(xml),
  crlfDelay: Infinity,
})) {
  if (line.trim() === "<Asset>") asset = {};
  if (!asset) continue;
  const m = line.match(/<(Name|Container|Type|PathID|Source)(?: [^>]*)?>(.*?)<\//);
  if (m) asset[m[1]] = unescape(m[2]);
  if (line.trim() !== "</Asset>") continue;
  count++;
  types[asset.Type] = (types[asset.Type] || 0) + 1;
  if (asset.Type === "TextAsset") textAssets.push(asset);
  if (asset.Source) asset.Source = remapSource(asset.Source);
  if (asset.Type === "Texture2D") textures.push(asset);
  if (asset.Type === "Sprite") sprites.push(asset);
  if (
    ["Texture2D", "Sprite"].includes(asset.Type) &&
    /icon|item|furniture|cloth|fish|insect|crop|seed|material|food/i.test(
      `${asset.Name} ${asset.Container}`,
    )
  )
    icons.push(asset);
  if (
    /excel|textmap|table|binoutput|\.bytes$|\.json$|\.lua$/i.test(
      `${asset.Name} ${asset.Container}`,
    )
  )
    candidates.push(asset);
  asset = null;
}
for (const [name, data] of Object.entries({ textAssets, icons, candidates, textures, sprites }))
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(data, null, 2));
const itemGroups = new Map();
for (const a of icons.filter(
  (x) => x.Type === "Texture2D" && /\/uisprite\/load\/item\//.test(x.Container ?? ""),
)) {
  if (!itemGroups.has(a.Container)) itemGroups.set(a.Container, []);
  itemGroups.get(a.Container).push(a);
}
const itemManifest = [...itemGroups.values()].map((variants) => {
  const preferred = variants.find((a) => /\\Persistent\\/i.test(a.Source)) ?? variants[0];
  return {
    ...preferred,
    SourceVariants: variants.map((a) => ({ Source: a.Source, PathID: a.PathID })),
    SelectionPolicy: "prefer Persistent overlay when indexed; retain all source variants",
  };
});
fs.writeFileSync(path.join(out, "item-icon-manifest.json"), JSON.stringify(itemManifest, null, 2));
const directories = {};
for (const a of icons) {
  const p = a.Container ? path.posix.dirname(a.Container) : "(empty)";
  directories[p] = (directories[p] || 0) + 1;
}
const summary = {
  count,
  types,
  textAssets: textAssets.length,
  iconCandidates: icons.length,
  candidates: candidates.length,
  iconDirectories: Object.entries(directories).sort((a, b) => b[1] - a[1]),
};
fs.writeFileSync(path.join(out, "index-summary.json"), JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify({ ...summary, iconDirectories: summary.iconDirectories.slice(0, 10) }, null, 2),
);
