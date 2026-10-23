import fs from "node:fs";
import path from "node:path";
import { buildAssetIndex } from "../client/asset-map.ts";
import { buildAssetMap, ensureAnimeStudio } from "../client/anime-studio/index.ts";
import { clientRoot, snapshotClient } from "../client/snapshot.ts";
import { identityDirectory, repoRoot } from "../paths.ts";
import { profile } from "../profile.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { implementationRevision, profileHash, toolIdentity } from "../workflow/identity.ts";
import { writeJson } from "../workflow/json.ts";
import { withLock } from "../workflow/lock.ts";
import { publishManifest, readManifest } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { swapDirectory } from "../workflow/swap.ts";
import { selectConfigSource } from "./config-source.ts";
import { validateResourceManifests } from "./resource-audit.ts";

export async function init(): Promise<string> {
  if (!fs.existsSync(clientRoot)) throw new Error(`Missing client snapshot: ${clientRoot}`);
  console.log("Hashing client snapshot");
  const snapshot = await snapshotClient();
  const animeStudio = await ensureAnimeStudio();
  const implementation = await implementationRevision();
  const identity = { client: snapshot.sha256, profileHash, tool: animeStudio, implementation };
  const id = digest(identity);
  const directory = identityDirectory("environments", id);

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
      const gameRoot = path.resolve(repoRoot, profile.paths.gameRoot);
      const configSource = selectConfigSource(
        gameRoot,
        path.resolve(repoRoot, profile.paths.clientIni),
      );
      writeJson(path.join(staging, "config-source.json"), configSource);

      const resourceAudit = await validateResourceManifests(gameRoot, profile.manifestId);
      writeJson(path.join(staging, "resource-manifest-audit.json"), {
        schemaVersion: 1,
        passed: true,
        manifests: resourceAudit,
      });

      const map = await buildAssetMap({
        input: gameRoot,
        output: staging,
        game: profile.animeGame,
        logFile: path.join(staging, "logs/asset-map.log"),
      });
      const { entries, audit } = await buildAssetIndex(map, gameRoot);
      writeJson(path.join(staging, "asset-index.json"), entries);
      writeJson(path.join(staging, "asset-map-audit.json"), {
        schemaVersion: 1,
        ...audit,
      });
      fs.rmSync(map, { force: true });

      if (digest((await snapshotClient()).files) !== identity.client)
        throw new Error("Client changed during initialization");
      const outputs = await inventory(staging, [
        "config-source.json",
        "asset-index.json",
        "asset-map-audit.json",
        "resource-manifest-audit.json",
      ]);
      const manifest: Manifest = {
        schemaVersion: 1,
        kind: "environment",
        id,
        status: "verified",
        createdAt: new Date().toISOString(),
        inputs: { id: profile.gameVersion, sha256: identity.client, files: snapshot.files },
        implementation,
        profileHash,
        tools: {
          animeStudio,
          animeStudioInput: digest(toolIdentity()),
          animeStudioRevision: toolIdentity().revision,
          dotnetSdk: toolIdentity().sdk,
          dotnetRuntime: toolIdentity().runtime,
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
