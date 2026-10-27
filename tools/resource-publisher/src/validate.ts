import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { parseCatalog } from "@loomix/content-schema";
import {
  parseNeighborImages,
  validateNeighborImages,
  parseNeighborDatabase,
} from "@loomix/neighbor-schema";
import {
  parseIslandDatabase,
  parseIslandImages,
  validateIslandCatalog,
  validateIslandImages,
} from "@loomix/island-schema";
import { referencedImages, sha256 } from "./release.ts";

export interface AssetFile {
  key: string;
  path: string;
  sha256: string;
  size: number;
}

export interface ValidatedContent {
  json: Buffer;
  contentSha256: string;
  neighbors: Buffer;
  neighborsSha256: string;
  neighborCount: number;
  neighborImages: Buffer;
  neighborImagesSha256: string;
  islands: Buffer;
  islandsSha256: string;
  islandsImages: Buffer;
  islandsImagesSha256: string;
  islandCount: number;
  assets: AssetFile[];
}

export async function readRegularFile(file: string): Promise<Buffer> {
  if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular file: ${file}`);
  return readFile(file);
}

export async function validateContent(directory: string): Promise<ValidatedContent> {
  const entries = (await readdir(directory)).filter((entry) => entry !== ".gitkeep");
  try {
    if (!(await lstat(path.join(directory, ".gitkeep"))).isFile())
      throw new Error(".gitkeep must be a regular file");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (
    entries.length !== 6 ||
    !entries.includes("content.json") ||
    !entries.includes("neighbors.json") ||
    !entries.includes("neighbor-images.json") ||
    !entries.includes("islands.json") ||
    !entries.includes("islands-images.json") ||
    !entries.includes("assets")
  ) {
    throw new Error(
      "Content directory must contain content.json, neighbors.json, neighbor-images.json, islands.json, islands-images.json, and assets/",
    );
  }
  const assetDirectory = path.join(directory, "assets");
  if (!(await lstat(assetDirectory)).isDirectory())
    throw new Error("assets/ must be a real directory");
  const json = await readRegularFile(path.join(directory, "content.json"));
  const content = parseCatalog(JSON.parse(json.toString("utf8")));
  const neighbors = await readRegularFile(path.join(directory, "neighbors.json"));
  const database = parseNeighborDatabase(JSON.parse(neighbors.toString("utf8")));
  if (
    database.source.gameVersion !== content.source.gameVersion ||
    database.source.dataRevision !== content.source.dataRevision ||
    database.source.resourceRevision !== content.source.resourceRevision
  ) {
    throw new Error("Neighbor database source does not match content.json");
  }
  const neighborImages = await readRegularFile(path.join(directory, "neighbor-images.json"));
  const mapping = parseNeighborImages(JSON.parse(neighborImages.toString("utf8")));
  validateNeighborImages(database, mapping);
  const islands = await readRegularFile(path.join(directory, "islands.json"));
  const islandDatabase = parseIslandDatabase(JSON.parse(islands.toString("utf8")));
  validateIslandCatalog(islandDatabase, content);
  if (islandDatabase.source.manifestId !== database.source.manifestId)
    throw new Error("Island manifest does not match neighbors.json");
  const islandsImages = await readRegularFile(path.join(directory, "islands-images.json"));
  const islandImageMapping = parseIslandImages(JSON.parse(islandsImages.toString("utf8")));
  validateIslandImages(islandDatabase, islandImageMapping);
  const images = [
    ...new Set([
      ...referencedImages(content, mapping),
      ...islandImageMapping.images.flatMap((entry) => (entry.image ? [entry.image] : [])),
    ]),
  ].sort();
  const files = await readdir(assetDirectory);
  const expected = new Set(images.map((image) => path.basename(image)));
  if (files.length !== expected.size || files.some((file) => !expected.has(file))) {
    throw new Error(
      "assets/ must contain exactly the images referenced by content.json, neighbor-images.json, and islands-images.json",
    );
  }
  const assets: AssetFile[] = [];
  for (const key of images) {
    const file = path.join(directory, key);
    const bytes = await readRegularFile(file);
    const hash = sha256(bytes);
    if (key !== `assets/${hash}.webp`) throw new Error(`Image SHA-256 mismatch: ${key}`);
    if (
      bytes.length < 20 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP" ||
      bytes.readUInt32LE(4) !== bytes.length - 8
    ) {
      throw new Error(`Invalid WebP container: ${key}`);
    }
    try {
      const { data, info } = await sharp(bytes, { failOn: "warning" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (data.length !== info.width * info.height * 4) throw new Error("Incomplete pixels");
    } catch (cause) {
      throw new Error(`Invalid complete WebP image: ${key}`, { cause });
    }
    assets.push({ key, path: file, sha256: hash, size: bytes.length });
  }
  return {
    json,
    contentSha256: sha256(json),
    neighbors,
    neighborsSha256: sha256(neighbors),
    neighborCount: database.neighbors.length,
    neighborImages,
    neighborImagesSha256: sha256(neighborImages),
    islands,
    islandsSha256: sha256(islands),
    islandsImages,
    islandsImagesSha256: sha256(islandsImages),
    islandCount: islandDatabase.islands.length,
    assets,
  };
}
