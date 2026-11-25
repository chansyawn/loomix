import { readManifest, resolveStage, verifyStageInputs } from "./workflow/manifest.ts";
import type { StageLocation, StageManifest } from "./workflow/manifest.ts";
import { verifyEnvironment } from "./environment/verify.ts";
import { verifyExtraction } from "./extraction/verify.ts";
import { verifySealedResourcePackage } from "./resource-package/verify.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { openClientSnapshot } from "./client/snapshot.ts";
import { profile } from "./profile.ts";
import { verifyDyeingExport } from "./extraction/source/hair-dyeing/inputs.ts";
import { verifyVignetteDiscoveryExport } from "./extraction/source/vignettes/inputs.ts";
import { readJson } from "./workflow/json.ts";
import type { ConfigSource } from "./environment/config-source.ts";
import type { IndexedAsset } from "./extraction/types.ts";

export async function verifyResourcePackage(
  { directory, id }: StageLocation,
  { reexportClientSources = false } = {},
): Promise<StageManifest<"resource-package">> {
  const manifest = await readManifest(directory, "resource-package", id);
  const extractionStage = resolveStage("extraction", manifest.inputs.id);
  const extraction = await verifyExtraction(extractionStage.directory, extractionStage.id);
  const environmentStage = resolveStage("environment", extraction.manifest.inputs.id);
  const environment = await verifyEnvironment(environmentStage.directory, environmentStage.id);
  await verifyStageInputs(extraction.manifest, environmentStage.directory, environment);
  if (reexportClientSources) {
    const snapshot = openClientSnapshot(environment.clientSnapshotId);
    const config = readJson<ConfigSource>(
      path.join(environmentStage.directory, "config-source.json"),
    );
    const active = (name: string) => {
      const file = config.files.find((entry) => path.basename(entry.path) === name);
      assert.ok(file, `Missing active ${name}`);
      return snapshot.resolvePath(`${profile.paths.gameRoot}/${file.path}`);
    };
    const source = path.join(extractionStage.directory, "source");
    const index = readJson<IndexedAsset[]>(
      path.join(environmentStage.directory, "asset-index.json"),
    );
    await verifyDyeingExport(
      source,
      { cs: active("cs.obb"), ed: active("ed.obb") },
      index,
      snapshot.resolvePath,
    );
    await verifyVignetteDiscoveryExport(source, index, snapshot.resolvePath);
  }
  await verifySealedResourcePackage(directory, manifest, extraction);
  return manifest;
}
