import path from "node:path";
import { exportAssets } from "../../client/anime-studio/index.ts";
import type { ClientSnapshot } from "../../client/snapshot.ts";
import { profile } from "../../profile.ts";
import type { ImageObject } from "./model.ts";

export interface ExportRequest {
  resolvePath: ClientSnapshot["resolvePath"];
  objects: readonly ImageObject[];
  destination: string;
}
export type ImageExporter = (request: ExportRequest) => Promise<ReadonlyMap<string, string>>;
const regex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const animeStudioExporter: ImageExporter = async ({ resolvePath, objects, destination }) => {
  const first = objects[0];
  if (!first) throw new Error("Empty image batch");
  await exportAssets({
    input: resolvePath(first.source),
    output: destination,
    game: profile.animeGame,
    types: [first.assetType],
    names: [`^(?:${objects.map((object) => regex(object.resourceName)).join("|")})$`],
    containers: [
      `^(?:${[...new Set(objects.map((object) => regex(object.container)))].join("|")})$`,
    ],
    logFile: path.join(destination, "export.log"),
  });
  return new Map(
    objects.map((object) => [
      object.key,
      path.join(destination, object.assetType, `${object.resourceName}.png`),
    ]),
  );
};
