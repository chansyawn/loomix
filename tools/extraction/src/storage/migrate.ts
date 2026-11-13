import fs from "node:fs";
import path from "node:path";
import { artifactsRoot, cacheRoot, dataRoot, repoRoot } from "../paths.ts";
import { filesWithin } from "../workflow/hashing.ts";
import { atomicJson, readManifest, verifyFiles } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { withLock } from "../workflow/lock.ts";
import { copyTree } from "../workflow/copy.ts";
import { z } from "zod";

const toolReadySchema = z.object({
  key: z.string(),
  outputs: z.array(
    z.object({ path: z.string(), sha256: z.string(), bytes: z.number().int().nonnegative() }),
  ),
});

async function migrateToolCache(source: string, destination: string): Promise<number> {
  if (!fs.existsSync(source)) return 0;
  let migrated = 0;
  for (const rid of fs.readdirSync(source)) {
    const platform = path.join(source, rid);
    if (!fs.lstatSync(platform).isDirectory()) continue;
    for (const key of fs.readdirSync(platform)) {
      if (!/^[a-f0-9]{20}$/.test(key)) continue;
      const original = path.join(platform, key);
      const readyFile = path.join(original, "ready.json");
      let ready: z.infer<typeof toolReadySchema>;
      try {
        ready = toolReadySchema.parse(JSON.parse(fs.readFileSync(readyFile, "utf8")));
        await verifyFiles(original, ready.outputs);
        const actual = filesWithin(original)
          .filter((file) => file !== "ready.json")
          .sort();
        if (
          JSON.stringify(actual) !== JSON.stringify(ready.outputs.map((file) => file.path).sort())
        )
          continue;
      } catch {
        // 只有完整且校验通过的工具缓存才允许迁移。
        continue;
      }
      const target = path.join(destination, rid, key);
      if (fs.existsSync(target)) {
        await verifyFiles(target, ready.outputs);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const staging = `${target}.${process.pid}.staging`;
      fs.rmSync(staging, { recursive: true, force: true });
      try {
        copyTree(original, staging);
        await verifyFiles(staging, ready.outputs);
        fs.renameSync(staging, target);
        migrated++;
      } catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
      }
    }
  }
  return migrated;
}

async function migrateArtifacts(source: string, destination: string): Promise<number> {
  if (!fs.existsSync(source)) return 0;
  let migrated = 0;
  for (const kind of ["environments", "extractions", "deliveries"] as const) {
    const sourceKind = path.join(source, kind);
    if (!fs.existsSync(sourceKind)) continue;
    for (const id of fs.readdirSync(sourceKind)) {
      if (!/^[a-f0-9]{64}$/.test(id)) continue;
      const original = path.join(sourceKind, id);
      const target = path.join(destination, kind, id);
      const artifactKind =
        kind === "environments"
          ? "environment"
          : kind === "extractions"
            ? "extraction"
            : "delivery";
      if (fs.existsSync(target)) {
        await readManifest(target, artifactKind);
        continue;
      }
      let manifest: Manifest;
      try {
        manifest = await readManifest(original, artifactKind);
        if (manifest.id !== id) continue;
      } catch {
        // 不完整、损坏或实现版本不同的产物留在旧目录中供人工检查。
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const staging = `${target}.${process.pid}.staging`;
      fs.rmSync(staging, { recursive: true, force: true });
      try {
        copyTree(original, staging);
        await verifyFiles(staging, manifest.outputs);
        fs.renameSync(staging, target);
        migrated++;
      } catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
      }
    }
  }
  return migrated;
}

export async function migrateLegacyStorage(): Promise<void> {
  const root = dataRoot();
  fs.mkdirSync(root, { recursive: true });
  const marker = path.join(root, "migration-v1.json");
  if (fs.existsSync(marker)) return;
  await withLock(path.join(root, ".migration-v1.lock"), async () => {
    if (fs.existsSync(marker)) return;
    const migratedTools = await migrateToolCache(
      path.join(repoRoot, "var/cache/anime-studio"),
      path.join(cacheRoot(), "anime-studio"),
    );
    const migratedArtifacts = await migrateArtifacts(
      path.join(repoRoot, "var/artifacts"),
      artifactsRoot(),
    );
    atomicJson(marker, {
      schemaVersion: 1,
      completedAt: new Date().toISOString(),
      migratedTools,
      migratedArtifacts,
    });
  });
}
