import fs from "node:fs";
import path from "node:path";
import { profile } from "../../profile.ts";
import { PNG } from "pngjs";
import { digest } from "../../workflow/hashing.ts";
import { within } from "../../paths.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { cachedDirectory } from "../cache.ts";
import type { IndexedAsset } from "../types.ts";
import { uniqueObjects, originalImageSchema } from "./model.ts";
import type { ImageObject, OriginalImage } from "./model.ts";
import { animeStudioExporter, type ImageExporter } from "./anime-studio.ts";

export function imageBatches(
  objects: readonly ImageObject[],
  index: readonly IndexedAsset[],
): ImageObject[][] {
  const groups = new Map<string, ImageObject[]>();
  for (const object of uniqueObjects(objects)) {
    const group = `${object.source}:${object.assetType}`;
    groups.set(group, [...(groups.get(group) ?? []), object]);
  }
  return [...groups.values()].flatMap((group) => {
    const isolated = group.filter(
      (object) =>
        new Set(
          index
            .filter(
              (entry) =>
                entry.Source === object.source &&
                entry.Type === object.assetType &&
                entry.Name === object.resourceName,
            )
            .map((entry) => `${entry.Container}:${entry.PathID}`),
        ).size > 1,
    );
    const normal = group.filter((object) => !isolated.includes(object));
    return [...(normal.length ? [normal] : []), ...isolated.map((object) => [object])];
  });
}

export async function exportOriginals(options: {
  objects: readonly ImageObject[];
  index: readonly IndexedAsset[];
  cache: string;
  work: string;
  clientSnapshotId: string;
  tool: string;
  implementation: string;
  exporter?: ImageExporter;
}): Promise<OriginalImage[]> {
  const results: OriginalImage[] = [];
  const exporter = options.exporter ?? animeStudioExporter;
  for (const objects of imageBatches(options.objects, options.index)) {
    const cache = await cachedDirectory(
      options.cache,
      {
        version: 1,
        tool: options.tool,
        implementation: options.implementation,
        game: profile.animeGame,
        objects,
      },
      async (staging) => {
        const output = path.join(staging, "output");
        fs.mkdirSync(output);
        const receipt = await exporter({
          clientSnapshotId: options.clientSnapshotId,
          objects,
          destination: output,
        });
        if (receipt.size !== objects.length) throw new Error("Incomplete exporter receipt");
        const originals: OriginalImage[] = [];
        for (const object of objects) {
          const file = receipt.get(object.key);
          if (!file) throw new Error(`Missing export ${object.key}`);
          const bytes = fs.readFileSync(within(staging, path.relative(staging, file)));
          const png = PNG.sync.read(bytes, { checkCRC: true });
          if (!png.width || !png.height || png.data.length !== png.width * png.height * 4)
            throw new Error(`Invalid PNG ${object.key}`);
          const sha256 = digest(bytes);
          const target = `${sha256}.png`;
          fs.writeFileSync(path.join(staging, target), bytes);
          originals.push({
            object: object.key,
            file: target,
            sha256,
            width: png.width,
            height: png.height,
          });
        }
        fs.rmSync(output, { recursive: true, force: true });
        writeJson(path.join(staging, "originals.json"), originals);
      },
    );
    fs.mkdirSync(path.join(options.work, "originals"), { recursive: true });
    for (const original of originalImageSchema
      .array()
      .parse(readJson(path.join(cache, "originals.json")))) {
      const file = `originals/${original.sha256}.png`;
      fs.copyFileSync(within(cache, original.file), path.join(options.work, file));
      results.push({ ...original, file });
    }
  }
  return results.sort((a, b) => a.object.localeCompare(b.object));
}
