import type { IndexedAsset } from "../types.ts";
import { getPaths } from "./config.ts";
import fs from "node:fs";
import path from "node:path";
import { readAssetMap } from "../../../infrastructure/anime-studio/asset-map.ts";

const { out, assetMap: xml } = getPaths();
fs.mkdirSync(out, { recursive: true });
const types: Record<string, number> = {},
  candidates: IndexedAsset[] = [],
  textAssets: IndexedAsset[] = [],
  icons: IndexedAsset[] = [],
  textures: IndexedAsset[] = [],
  sprites: IndexedAsset[] = [];
let count = 0;
const remapSource = (source: string) => {
  const m = source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(.*)$/);
  if (!m || m[1].split("/").includes("..") || path.isAbsolute(m[1]))
    throw new Error(`Unrecognized Asset Map source: ${source}`);
  return path.join(getPaths().gameRoot, m[1]);
};
for await (const asset of readAssetMap(xml)) {
  const indexed: IndexedAsset = {
    Name: asset.Name,
    Container: asset.Container,
    Type: asset.Type,
    PathID: asset.PathID,
    Source: asset.Source,
  };
  count++;
  types[asset.Type] = (types[asset.Type] || 0) + 1;
  if (asset.Type === "TextAsset") textAssets.push(indexed);
  if (indexed.Source) indexed.Source = remapSource(indexed.Source);
  if (asset.Type === "Texture2D") textures.push(indexed);
  if (asset.Type === "Sprite") sprites.push(indexed);
  if (
    ["Texture2D", "Sprite"].includes(asset.Type) &&
    /icon|item|furniture|cloth|fish|insect|crop|seed|material|food/i.test(
      `${asset.Name} ${asset.Container}`,
    )
  )
    icons.push(indexed);
  if (
    /excel|textmap|table|binoutput|\.bytes$|\.json$|\.lua$/i.test(
      `${asset.Name} ${asset.Container}`,
    )
  )
    candidates.push(indexed);
}
for (const [name, data] of Object.entries({ textAssets, icons, candidates, textures, sprites }))
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(data, null, 2));
const itemGroups = new Map<string, IndexedAsset[]>();
for (const a of icons.filter(
  (x) => x.Type === "Texture2D" && /\/uisprite\/load\/item\//.test(x.Container ?? ""),
)) {
  if (!a.Container) continue;
  if (!itemGroups.has(a.Container)) itemGroups.set(a.Container, []);
  itemGroups.get(a.Container)!.push(a);
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
const directories: Record<string, number> = {};
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
