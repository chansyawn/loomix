import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assembleRelease, parseReleaseManifest } from "@loomix/schema/release";
import type { DocumentKind, Release } from "@loomix/schema/release";
import { sha256 } from "./release.ts";

export interface AssetFile {
  key: string;
  path: string;
  sha256: string;
  size: number;
}
export interface DocumentFile {
  key: string;
  bytes: Buffer;
  sha256: string;
}
export interface ValidatedContent {
  release: Release;
  manifestSha256: string;
  documents: DocumentFile[];
  assets: AssetFile[];
}

export async function readRegularFile(file: string): Promise<Buffer> {
  if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular file: ${file}`);
  return readFile(file);
}

async function filesWithin(directory: string): Promise<string[]> {
  if (!(await lstat(directory)).isDirectory())
    throw new Error(`Expected a real directory: ${directory}`);
  const files: string[] = [];
  const visit = async (prefix: string): Promise<void> => {
    for (const name of await readdir(path.join(directory, prefix))) {
      const relative = prefix ? `${prefix}/${name}` : name;
      const stat = await lstat(path.join(directory, relative));
      if (relative === ".gitkeep" && !stat.isFile())
        throw new Error(".gitkeep must be a regular file");
      if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${relative}`);
      if (stat.isDirectory()) await visit(relative);
      else if (stat.isFile()) files.push(relative);
      else throw new Error(`Expected a regular file: ${relative}`);
    }
  };
  await visit("");
  return files.filter((file) => file !== ".gitkeep").sort();
}

export async function validateContent(directory: string): Promise<ValidatedContent> {
  const actual = await filesWithin(directory);
  const manifestBytes = await readRegularFile(path.join(directory, "release.json"));
  const manifest = parseReleaseManifest(JSON.parse(manifestBytes.toString("utf8")));
  const documents: DocumentFile[] = [];
  const parsed = new Map<DocumentKind, unknown>();
  for (const file of manifest.files) {
    const bytes = await readRegularFile(path.join(directory, file.path));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
      throw new Error(`Document SHA-256 or size mismatch: ${file.path}`);
    parsed.set(file.kind, JSON.parse(bytes.toString("utf8")));
    documents.push({ key: file.path, bytes, sha256: file.sha256 });
  }
  const release = assembleRelease(manifest, parsed);
  const expectedImages = new Map(release.assets.images.map((image) => [image.file, image]));
  const expected = [
    "release.json",
    ...manifest.files.map((file) => file.path),
    ...expectedImages.keys(),
  ].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Release directory must contain exactly the declared documents and images");
  const assets: AssetFile[] = [];
  for (const [key, image] of expectedImages) {
    const file = path.join(directory, key);
    const bytes = await readRegularFile(file);
    if (sha256(bytes) !== image.sha256 || bytes.length !== image.bytes)
      throw new Error(`Image SHA-256 or size mismatch: ${key}`);
    if (
      bytes.length < 20 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP" ||
      bytes.readUInt32LE(4) !== bytes.length - 8
    )
      throw new Error(`Invalid WebP container: ${key}`);
    try {
      const { data, info } = await sharp(bytes, { failOn: "warning" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (
        data.length !== info.width * info.height * 4 ||
        info.width !== image.width ||
        info.height !== image.height
      )
        throw new Error("Image dimensions or complete pixels mismatch");
    } catch (cause) {
      throw new Error(`Invalid complete WebP image: ${key}`, { cause });
    }
    assets.push({ key, path: file, sha256: image.sha256, size: bytes.length });
  }
  const manifestSha256 = sha256(manifestBytes);
  documents.push({ key: "release.json", bytes: manifestBytes, sha256: manifestSha256 });
  return { release, manifestSha256, documents, assets };
}
