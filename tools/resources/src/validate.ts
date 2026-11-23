import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import {
  assembleWebsiteResources,
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceManifestSchema,
  type WebsiteResourceDocumentType,
  type WebsiteResourceManifest,
  type WebsiteResources,
} from "@loomix/schema/website-resources";
import { isMissingFile, readRegularFile } from "./files.ts";
import { sha256 } from "./release.ts";

export interface LocalImageFile {
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
export interface ValidatedWebsiteResources {
  websiteResources: WebsiteResources;
  manifestSha256: string;
  documents: DocumentFile[];
  imageFiles: LocalImageFile[];
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

export async function validateWebsiteResources(
  directory: string,
): Promise<ValidatedWebsiteResources> {
  const actual = await filesWithin(directory);
  const manifestPath = path.join(directory, WEBSITE_RESOURCE_MANIFEST_FILE);
  const manifestBytes = await readRegularFile(manifestPath).catch((cause: unknown) => {
    if (isMissingFile(cause)) {
      throw new Error(`未找到本地网站资源清单：${manifestPath}。请先安装本地资源。`, { cause });
    }
    throw cause;
  });
  let manifest: WebsiteResourceManifest;
  try {
    manifest = WebsiteResourceManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
  } catch (cause) {
    throw new Error(
      `本地网站资源清单不符合当前契约。请重新提取、打包、验证并安装本地资源。${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
  const documents: DocumentFile[] = [];
  const parsed = new Map<WebsiteResourceDocumentType, unknown>();
  for (const file of manifest.files) {
    const bytes = await readRegularFile(path.join(directory, file.path));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
      throw new Error(`Document SHA-256 or size mismatch: ${file.path}`);
    parsed.set(file.kind, JSON.parse(bytes.toString("utf8")));
    documents.push({ key: file.path, bytes, sha256: file.sha256 });
  }
  const websiteResources = assembleWebsiteResources(manifest, parsed);
  const expectedImages = new Map(
    websiteResources.imageIndex.images.map((image) => [image.file, image]),
  );
  const expected = [
    WEBSITE_RESOURCE_MANIFEST_FILE,
    ...manifest.files.map((file) => file.path),
    ...expectedImages.keys(),
  ].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      "Website resource directory must contain exactly the declared documents and images",
    );
  const imageFiles: LocalImageFile[] = [];
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
      const { default: sharp } = await import("sharp");
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
    imageFiles.push({ key, path: file, sha256: image.sha256, size: bytes.length });
  }
  const manifestSha256 = sha256(manifestBytes);
  documents.push({
    key: WEBSITE_RESOURCE_MANIFEST_FILE,
    bytes: manifestBytes,
    sha256: manifestSha256,
  });
  return { websiteResources, manifestSha256, documents, imageFiles };
}
