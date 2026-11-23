import fs from "node:fs";
import path from "node:path";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { buildAssetIndex } from "../client/asset-map.ts";
import { buildAssetMap, ensureAnimeStudio } from "../client/anime-studio/index.ts";
import { resolveClientSnapshot } from "../client/snapshot.ts";
import { identityDirectory } from "../paths.ts";
import { profile } from "../profile.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { implementationRevision, profileHash, toolIdentity } from "../workflow/identity.ts";
import { writeJson } from "../workflow/json.ts";
import { withLock } from "../workflow/lock.ts";
import { publishManifest, STAGE_MANIFEST_VERSION } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { swapDirectory } from "../workflow/swap.ts";
import { selectConfigSource } from "./config-source.ts";
import { validateResourceManifests } from "./resource-audit.ts";
import { ENVIRONMENT_OUTPUT_FILES } from "./files.ts";
import { readVerifiedEnvironment } from "./verify.ts";

export async function init(snapshotId?: string): Promise<string> {
  const { snapshot, diagnostics } = resolveClientSnapshot(profile, snapshotId);
  const clientSnapshotId = snapshot.id;
  for (const diagnostic of diagnostics) console.error(`Skipping client snapshot ${diagnostic}`);
  console.error(
    `Verifying client ${profile.gameVersion} snapshot ${clientSnapshotId} (${snapshot.directory})`,
  );
  await snapshot.verify();
  const animeStudio = await ensureAnimeStudio();
  const tool = toolIdentity();
  const implementation = await implementationRevision();
  const identity = {
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    formatVersion: FORMAT_VERSION,
    clientSnapshotId,
    profileHash,
    tool: animeStudio,
    implementation,
  };
  const id = digest(identity);
  const directory = identityDirectory("environments", id);

  await withLock(`${directory}.lock`, async () => {
    try {
      const existing = await readVerifiedEnvironment(directory);
      if (
        existing.id !== id ||
        existing.clientSnapshotId !== clientSnapshotId ||
        existing.implementation !== implementation ||
        existing.profileHash !== profileHash
      )
        throw new Error("Changed environment identity");
      console.error(`Reusing verified environment ${id}`);
      return;
    } catch {
      /* 不完整或已变更的环境一律不可复用。 */
    }
    const staging = `${directory}.staging`;
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    try {
      const gameRoot = snapshot.resolvePath(profile.paths.gameRoot);
      const configSource = selectConfigSource(
        gameRoot,
        snapshot.resolvePath(profile.paths.clientIni),
      );
      writeJson(path.join(staging, "config-source.json"), configSource);

      const resourceAudit = await validateResourceManifests(gameRoot, profile.manifestId);
      writeJson(path.join(staging, "resource-manifest-audit.json"), {
        passed: true,
        manifests: resourceAudit,
      });

      const map = await buildAssetMap({
        input: gameRoot,
        output: staging,
        game: profile.animeGame,
        logFile: path.join(staging, "logs/asset-map.log"),
      });
      const { entries, audit } = await buildAssetIndex(map, {
        binDataNames: new Set(Object.values(profile.binData)),
      });
      writeJson(path.join(staging, "asset-index.json"), entries);
      writeJson(path.join(staging, "asset-map-audit.json"), audit);
      fs.rmSync(map, { force: true });

      await snapshot.verify();
      const outputs = await inventory(staging, [...ENVIRONMENT_OUTPUT_FILES]);
      const manifest: Manifest = {
        stageManifestVersion: STAGE_MANIFEST_VERSION,
        kind: "environment",
        id,
        clientSnapshotId,
        status: "verified",
        createdAt: new Date().toISOString(),
        inputs: { id: clientSnapshotId, sha256: clientSnapshotId, files: [...snapshot.files] },
        implementation,
        profileHash,
        tools: {
          animeStudio,
          animeStudioInput: digest(tool),
          animeStudioRevision: tool.revision,
          dotnetSdk: tool.sdk,
          dotnetRuntime: tool.runtime,
          node: process.version,
        },
        outputs,
        result: { passed: true, validation: "passed", failures: [] },
      };
      if ((await implementationRevision()) !== implementation)
        throw new Error("Implementation changed during init; rerun init");
      await publishManifest(staging, manifest);
      swapDirectory(staging, directory);
    } catch (error) {
      writeJson(path.join(staging, "failure-report.json"), {
        passed: false,
        error: String(error),
      });
      throw new Error(
        `Initialization failed: ${String(error)}; see ${path.join(staging, "failure-report.json")}`,
        { cause: error },
      );
    }
  });
  return id;
}
