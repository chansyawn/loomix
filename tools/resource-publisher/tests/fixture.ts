import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyDataset } from "@loomix/schema/dataset";
import type { Dataset } from "@loomix/schema/dataset";
import type { Assets } from "@loomix/schema/assets";
import type { DocumentKind } from "@loomix/schema/release";
import { documentPath } from "@loomix/schema/release";
import { sha256 } from "../src/release.ts";
export const webp = Buffer.from(
  "UklGRuYAAABXRUJQVlA4WAoAAAAQAAAA/wAA/wAAQUxQSBIAAAABB1DAiAgAKNL//xTR/9T//gNWUDggrgAAADARAJ0BKgABAAE+bTaZSaQjIqEgKACADYlpbuF2sR7cAAAWlsnIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32rAAP7/XGb//ztbDEFS//+tt383sqAAAAAAAAAAAA==",
  "base64",
);
export const imageKey = `assets/${sha256(webp)}.webp`;

export const context = { formatVersion: 1, snapshotId: "a".repeat(64), locale: "zh-CN" } as const;
export const source = {
  gameVersion: "test",
  dataRevision: 1,
  resourceRevision: 1,
  manifestId: "1",
};
export function emptyRelease() {
  return {
    dataset: emptyDataset(context, source),
    assets: { ...context, kind: "assets" as const, images: [] } as Assets,
  };
}
export async function writeDocuments(directory: string, dataset: Dataset, assets: Assets) {
  const documents = {
    catalog: dataset.catalog,
    neighbors: dataset.neighbors,
    world: dataset.world,
    assets,
  };
  const files = [];
  for (const kind of Object.keys(documents) as DocumentKind[]) {
    const file = documentPath(kind, context.locale);
    const bytes = Buffer.from(JSON.stringify(documents[kind]));
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), bytes);
    files.push({ kind, path: file, sha256: sha256(bytes), bytes: bytes.length });
  }
  const manifest = { ...dataset.context, source: dataset.source, files };
  await writeFile(path.join(directory, "release.json"), JSON.stringify(manifest));
  return manifest;
}
export async function writeFixture(directory: string, imageCount = 1, payloads?: Buffer[]) {
  const { dataset, assets } = emptyRelease();
  await mkdir(path.join(directory, "assets"), { recursive: true });
  for (let i = 0; i < imageCount; i++) {
    const chunk = Buffer.alloc(8 + i * 2);
    chunk.write("JUNK");
    chunk.writeUInt32LE(i * 2, 4);
    const bytes = payloads?.[i] ?? (i === 0 ? webp : Buffer.concat([webp, chunk]));
    if (!payloads && i) bytes.writeUInt32LE(bytes.length - 8, 4);
    const hash = sha256(bytes),
      file = `assets/${hash}.webp`;
    const image = { assetId: `image-${i}`, variant: "icon" as const };
    dataset.catalog.items.push({
      id: i + 1,
      name: "Image",
      type: "reference",
      description: null,
      quality: null,
      image,
    });
    assets.images.push({
      ...image,
      file,
      sha256: hash,
      bytes: bytes.length,
      width: 256,
      height: 256,
    });
    await writeFile(path.join(directory, file), bytes);
  }
  return { dataset, assets, manifest: await writeDocuments(directory, dataset, assets) };
}
