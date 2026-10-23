import { inspectAssetMap } from "../../client/asset-map.ts";

export async function verifyAssetMap(file: string): Promise<{
  assets: number;
  baseSources: number;
  persistentSources: number;
}> {
  const coverage = await inspectAssetMap(file);
  if (!coverage.baseSources || !coverage.persistentSources)
    throw new Error("Asset Map must contain base and Persistent resources");
  return coverage;
}
