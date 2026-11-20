import { ImageFileSchema } from "@loomix/schema/assets";
import { HashSchema } from "@loomix/schema/common";
import { ReleaseIdSchema, ReleaseMarkerSchema } from "@loomix/schema/release";
import { z } from "zod";
import { sha256 } from "./release.ts";
import type { MaintenanceStore, StoredObject } from "./store.ts";

const day = 86_400_000;
const legacyMarker = ReleaseMarkerSchema.omit({ storageLayout: true });
const markerSchema = z.union([ReleaseMarkerSchema, legacyMarker]);
const assetIndex = z.object({
  images: z.array(
    z
      .object({ file: ImageFileSchema, sha256: HashSchema })
      .refine((image) => image.file === `assets/${image.sha256}.webp`),
  ),
});
const manifestIndex = z.object({
  files: z.array(
    z.object({
      kind: z.string(),
      path: z.string(),
      sha256: HashSchema,
      bytes: z.number().int().positive(),
    }),
  ),
});

function decode(bytes: Uint8Array): unknown {
  return JSON.parse(Buffer.from(bytes).toString("utf8"));
}

async function retainedImages(
  store: MaintenanceStore,
  release: string,
  completionKey: string,
): Promise<string[]> {
  const marker = markerSchema.parse(decode(await store.read(completionKey)));
  if (marker.release !== release) throw new Error(`完成标记与资源版本不符：${release}`);
  if (!("storageLayout" in marker)) return [];
  const prefix = `releases/${release}/`;
  const manifestBytes = await store.read(`${prefix}release.json`);
  if (sha256(manifestBytes) !== marker.manifestSha256)
    throw new Error(`资源发布清单哈希不符：${release}`);
  const assets = manifestIndex
    .parse(decode(manifestBytes))
    .files.filter((file) => file.kind === "assets");
  if (assets.length !== 1 || assets[0].path !== "assets.json")
    throw new Error(`资源发布清单未声明有效的图片索引：${release}`);
  const indexBytes = await store.read(`${prefix}assets.json`);
  if (indexBytes.length !== assets[0].bytes || sha256(indexBytes) !== assets[0].sha256)
    throw new Error(`图片索引大小或哈希不符：${release}`);
  return assetIndex.parse(decode(indexBytes)).images.map((image) => image.file);
}

async function releasesById(store: MaintenanceStore) {
  const releases = new Map<string, Map<string, StoredObject>>();
  for (const object of await store.list("releases/")) {
    const match = /^releases\/([^/]+)\/(.+)$/.exec(object.key);
    if (!match) throw new Error(`无法识别资源版本对象：${object.key}`);
    const release = ReleaseIdSchema.parse(match[1]);
    const files = releases.get(release) ?? new Map();
    files.set(match[2], object);
    releases.set(release, files);
  }
  return releases;
}

export async function listReleases(store: MaintenanceStore) {
  return Array.from(await releasesById(store), ([release, files]) => {
    const completedAt = files.get("_complete.json")?.modified;
    const retiredAt = files.get("_retired.json")?.modified;
    return { release, completedAt, retiredAt };
  }).sort((left, right) => left.release.localeCompare(right.release));
}

export async function setReleaseRetired(
  store: MaintenanceStore,
  release: string,
  retired: boolean,
  keep: readonly string[] = [],
): Promise<void> {
  ReleaseIdSchema.parse(release);
  if (retired && keep.includes(release)) throw new Error(`资源版本受到保护：${release}`);
  const prefix = `releases/${release}/`;
  const marker = markerSchema.parse(decode(await store.read(`${prefix}_complete.json`)));
  if (marker.release !== release) throw new Error(`完成标记与资源版本不符：${release}`);
  const key = `${prefix}_retired.json`;
  if (retired) {
    const bytes = Buffer.from(JSON.stringify({ release }));
    await store.tryReserve(key, bytes, "application/json", sha256(bytes));
  } else {
    await store.remove([key]);
  }
}

export async function planCleanup(
  store: MaintenanceStore,
  keep: readonly string[],
  now = new Date(),
) {
  if (!keep.length) throw new Error("至少需要提供一个受保护的资源版本");
  const keepSet = new Set(keep.map((release) => ReleaseIdSchema.parse(release)));
  const releases = await releasesById(store);
  for (const release of keepSet) {
    if (!releases.get(release)?.has("_complete.json"))
      throw new Error(`受保护的资源版本缺少完成标记：${release}`);
    if (releases.get(release)?.has("_retired.json"))
      throw new Error(`受保护的资源版本已标记退役，请先恢复：${release}`);
  }

  const marked = new Set<string>();
  const expiredReleases: string[] = [];
  const completionMarkers: StoredObject[] = [];
  const releaseFiles: StoredObject[] = [];
  for (const [release, files] of releases) {
    const complete = files.get("_complete.json");
    const retired = files.get("_retired.json");
    const expired = retired && now.getTime() - retired.modified.getTime() >= 30 * day;
    if (complete && (keepSet.has(release) || !expired)) {
      for (const key of await retainedImages(store, release, complete.key)) marked.add(key);
      continue;
    }
    const upload = files.get("_upload.json");
    const content = [...files.entries()]
      .filter(([name]) => !["_upload.json", "_retired.json", "_complete.json"].includes(name))
      .map(([, object]) => object);
    const abandoned =
      !complete &&
      !retired &&
      upload &&
      [upload, ...content].every((object) => now.getTime() - object.modified.getTime() >= 7 * day);
    if (!complete && !expired && !abandoned && !upload && content.length)
      throw new Error(`资源版本缺少占号或完成标记：${release}`);
    if (expired || abandoned) {
      if (complete || content.length) expiredReleases.push(release);
      if (complete) completionMarkers.push(complete);
      releaseFiles.push(...content);
    }
  }

  const orphanImages = (await store.list("assets/")).filter(
    (object) =>
      ImageFileSchema.safeParse(object.key).success &&
      !marked.has(object.key) &&
      now.getTime() - object.modified.getTime() >= 7 * day,
  );
  const objects = [...completionMarkers, ...releaseFiles, ...orphanImages];
  const keys = (files: StoredObject[]) => files.map((file) => file.key).sort();
  return {
    keep: [...keepSet].sort(),
    expiredReleases: expiredReleases.sort(),
    completionMarkers: keys(completionMarkers),
    releaseFiles: keys(releaseFiles),
    orphanImages: keys(orphanImages),
    objectCount: objects.length,
    bytes: objects.reduce((sum, object) => sum + object.size, 0),
  };
}

export async function applyCleanup(
  store: MaintenanceStore,
  plan: Awaited<ReturnType<typeof planCleanup>>,
): Promise<void> {
  await store.remove(plan.completionMarkers);
  await store.remove(plan.releaseFiles);
  await store.remove(plan.orphanImages);
}
