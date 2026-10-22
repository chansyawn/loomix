import fs from "node:fs";
import readline from "node:readline";

export async function verifyAssetMap(
  file: string,
): Promise<{ assets: number; baseSources: number; persistentSources: number }> {
  let assets = 0,
    baseSources = 0,
    persistentSources = 0,
    closed = false;
  for await (const line of readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  })) {
    if (line.trim() === "<Asset>") assets++;
    if (/<Source[^>]*>/.test(line)) {
      if (/[\\/]StreamingAssets[\\/]/i.test(line)) baseSources++;
      if (/[\\/]Persistent[\\/]/i.test(line)) persistentSources++;
    }
    if (line.trim() === "</Assets>") closed = true;
  }
  if (!closed || !assets || !baseSources || !persistentSources)
    throw new Error("Asset Map must contain base and Persistent resources");
  return { assets, baseSources, persistentSources };
}
