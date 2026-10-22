import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { profile, repoRoot } from "../../tasks/content/config.ts";
import { runProcess } from "../../tasks/content/io.ts";
import { buildAssetMap, ensureAnimeStudio } from "../../infrastructure/anime-studio/index.ts";
import { withLock } from "../../infrastructure/anime-studio/lock.ts";
import { digest, inventory } from "../../infrastructure/hashing.ts";
import {
  atomicJson,
  publishManifest,
  readManifest,
  verifyFiles,
} from "../../infrastructure/manifests.ts";
import type { Manifest } from "../../infrastructure/manifests.ts";
import { identityDirectory } from "../../infrastructure/paths.ts";
import {
  implementationRevision,
  profileHash,
  toolIdentity,
  gitRevision,
} from "../../infrastructure/identity.ts";

import { verifyAssetMap } from "./asset-map.ts";
import { validateResourceManifests } from "./resource-manifests.ts";

export const clientRoot = path.resolve(repoRoot, "resources/game-client");

export async function validateClient(environment: Manifest): Promise<void> {
  await verifyFiles(clientRoot, environment.inputs.files);
  const files = await inventory(clientRoot);
  if (digest(files) !== environment.inputs.sha256)
    throw new Error("Client snapshot changed; run init again");
}

export async function init(): Promise<string> {
  if (!fs.existsSync(clientRoot)) throw new Error(`Missing client snapshot: ${clientRoot}`);
  console.log("Hashing client snapshot");
  const files = await inventory(clientRoot);
  const animeStudio = await ensureAnimeStudio();
  const implementation = await implementationRevision();
  const identity = { client: digest(files), profileHash, tool: animeStudio, implementation };
  const id = digest(identity),
    directory = identityDirectory("environments", id);
  await withLock(`${directory}.lock`, async () => {
    try {
      const existing = await readManifest(directory, "environment");
      if (
        existing.id !== id ||
        existing.implementation !== implementation ||
        existing.profileHash !== profileHash
      )
        throw new Error("Changed environment identity");
      console.log(`Reusing verified environment ${id}`);
      return;
    } catch {
      /* An incomplete or changed environment is never reusable. */
    }
    const staging = `${directory}.staging`;
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    try {
      await runProcess(
        process.execPath,
        [
          fileURLToPath(
            new URL("../../tasks/content/preparation/select-config-source.ts", import.meta.url),
          ),
          "--output",
          staging,
        ],
        path.join(staging, "logs/preflight.log"),
      );
      const resourceAudit = await validateResourceManifests(
        path.resolve(repoRoot, profile.paths.gameRoot),
        profile.manifestId,
      );
      atomicJson(path.join(staging, "resource-manifest-audit.json"), {
        schemaVersion: 1,
        passed: true,
        manifests: resourceAudit,
      });
      const map = await buildAssetMap({
        input: path.resolve(repoRoot, profile.paths.gameRoot),
        output: staging,
        game: profile.animeGame,
        logFile: path.join(staging, "logs/asset-map.log"),
      });
      const mapCoverage = await verifyAssetMap(map);
      fs.renameSync(map, path.join(staging, "asset-map.xml"));
      atomicJson(path.join(staging, "asset-map.manifest.json"), {
        schemaVersion: 1,
        inputs: identity,
        coverage: mapCoverage,
        output: await inventory(staging, ["asset-map.xml"]),
      });
      atomicJson(path.join(staging, "preparation-report.json"), {
        passed: true,
        gameVersion: profile.gameVersion,
        dataRevision: profile.dataRevision,
        resourceRevision: profile.resourceRevision,
        gitRevision: gitRevision(),
        identity,
      });
      if (digest(await inventory(clientRoot)) !== identity.client)
        throw new Error("Client changed during initialization");
      const manifest: Manifest = {
        schemaVersion: 1,
        kind: "environment",
        id,
        status: "verified",
        createdAt: new Date().toISOString(),
        inputs: { id: profile.gameVersion, sha256: identity.client, files },
        implementation,
        profileHash,
        tools: {
          animeStudio,
          animeStudioInput: digest(toolIdentity()),
          animeStudioRevision: toolIdentity().revision,
          dotnetSdk: toolIdentity().sdk,
          dotnetRuntime: toolIdentity().runtime,
          node: process.version,
          pngjs: "7.0.0",
        },
        outputs: await inventory(staging, [
          "asset-map.xml",
          "asset-map.manifest.json",
          "resource-manifest-audit.json",
          "preparation-report.json",
          "active-config-source.json",
          "version-audit.json",
        ]),
        result: { passed: true, validation: "passed", failures: [] },
      };
      if ((await implementationRevision()) !== implementation)
        throw new Error("Implementation changed during init; rerun init");
      await publishManifest(staging, manifest);
      // A failed replacement keeps the last verified environment recoverable.
      const previous = `${directory}.previous`;
      fs.rmSync(previous, { recursive: true, force: true });
      if (fs.existsSync(directory)) fs.renameSync(directory, previous);
      try {
        fs.renameSync(staging, directory);
      } catch (error) {
        if (fs.existsSync(previous)) fs.renameSync(previous, directory);
        throw error;
      }
      fs.rmSync(previous, { recursive: true, force: true });
    } catch (error) {
      atomicJson(path.join(staging, "failure-report.json"), {
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
