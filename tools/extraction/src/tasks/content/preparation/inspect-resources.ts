import type { AssetMapAsset } from "../../../client/asset-map.ts";
import { getPaths } from "./config.ts";
import fs from "node:fs";
import path from "node:path";
import { readJson } from "../../../workflow/json.ts";

const { out, assetIndex } = getPaths();
fs.mkdirSync(out, { recursive: true });
const entries = readJson<AssetMapAsset[]>(assetIndex);
const types: Record<string, number> = {};
for (const asset of entries) types[asset.Type] = (types[asset.Type] ?? 0) + 1;
const textures = entries.filter((asset) => asset.Type === "Texture2D");
const sprites = entries.filter((asset) => asset.Type === "Sprite");
fs.writeFileSync(path.join(out, "textures.json"), JSON.stringify(textures, null, 2));
fs.writeFileSync(path.join(out, "sprites.json"), JSON.stringify(sprites, null, 2));
const summary = {
  count: entries.length,
  types,
  textures: textures.length,
  sprites: sprites.length,
};
fs.writeFileSync(path.join(out, "index-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
