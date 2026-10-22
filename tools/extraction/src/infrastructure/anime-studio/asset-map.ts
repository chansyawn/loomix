import fs from "node:fs";
import sax from "sax";

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
