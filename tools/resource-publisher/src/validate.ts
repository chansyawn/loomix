import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseContent } from "@petit-orbit/content-schema";
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
  assets: AssetFile[];
}

export async function readRegularFile(file: string): Promise<Buffer> {
  if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular file: ${file}`);
  return readFile(file);
}

export async function validateContent(directory: string): Promise<ValidatedContent> {
  const entries = await readdir(directory);
  if (entries.length !== 2 || !entries.includes("content.json") || !entries.includes("assets")) {
    throw new Error("Content directory must contain only content.json and assets/");
  }
  const assetDirectory = path.join(directory, "assets");
  if (!(await lstat(assetDirectory)).isDirectory())
    throw new Error("assets/ must be a real directory");
  const json = await readRegularFile(path.join(directory, "content.json"));
  const content = parseContent(JSON.parse(json.toString("utf8")));
  const images = referencedImages(content);
  const files = await readdir(assetDirectory);
  const expected = new Set(images.map((image) => path.basename(image)));
  if (files.length !== expected.size || files.some((file) => !expected.has(file))) {
    throw new Error("assets/ must contain exactly the images referenced by content.json");
  }
  const assets: AssetFile[] = [];
  for (const key of images) {
    const file = path.join(directory, key);
    const bytes = await readRegularFile(file);
    const hash = sha256(bytes);
    if (key !== `assets/${hash}.png`) throw new Error(`Image SHA-256 mismatch: ${key}`);
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new Error(`Invalid PNG signature: ${key}`);
    }
    assets.push({ key, path: file, sha256: hash, size: bytes.length });
  }
  return { json, contentSha256: sha256(json), assets };
}
