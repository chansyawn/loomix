import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openClientSnapshot } from "../client/snapshot.ts";
import { within } from "../paths.ts";
import { assertAssetMapCoverage } from "../client/asset-map.ts";
import { profile } from "../profile.ts";
import { readJson } from "../workflow/json.ts";
import { readManifest } from "../workflow/manifest.ts";
import type { StageManifest } from "../workflow/manifest.ts";
import type { ConfigSource } from "./config-source.ts";
import { ENVIRONMENT_OUTPUT_FILES } from "./files.ts";

interface AssetMapAudit {
  assets: number;
  indexed: number;
  baseSources: number;
  persistentSources: number;
}

interface ResourceAudit {
  passed: boolean;
  manifests: { manifest: string; checked: number }[];
}

export async function readVerifiedEnvironment(
  directory: string,
  expectedId?: string,
): Promise<StageManifest<"environment">> {
  const manifest = await readManifest(directory, "environment", expectedId);
  assert.deepEqual(
    manifest.outputs.map((file) => file.path).sort(),
    ENVIRONMENT_OUTPUT_FILES,
    "Extraction environment manifest output file set",
  );
  return manifest;
}

export async function verifyEnvironment(
  directory: string,
  expectedId?: string,
): Promise<StageManifest<"environment">> {
  const manifest = await readVerifiedEnvironment(directory, expectedId);
  const snapshot = openClientSnapshot(manifest.clientSnapshotId);
  await snapshot.verify();
  const gameRoot = snapshot.resolvePath(profile.paths.gameRoot);
  const source = readJson<ConfigSource>(path.join(directory, "config-source.json"));
  if (
    source.dataRevision !== profile.dataRevision ||
    source.branch !== profile.branch ||
    source.files.length !== 2 ||
    !source.files.every((file) => file.matchesManifest && file.sha256)
  )
    throw new Error("Environment config source is not verified");
  for (const file of source.files) {
    const bytes = fs.readFileSync(within(gameRoot, file.path));
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== file.sha256) throw new Error(`Config source changed: ${file.path}`);
  }
  const coverage = readJson<AssetMapAudit>(path.join(directory, "asset-map-audit.json"));
  assertAssetMapCoverage(coverage);
  if (!coverage.indexed) throw new Error("Asset index is empty");
  const audit = readJson<ResourceAudit>(path.join(directory, "resource-manifest-audit.json"));
  if (!audit.passed || !audit.manifests.length)
    throw new Error("Resource manifest audit is not verified");
  if (!fs.statSync(path.join(directory, "asset-index.json")).size)
    throw new Error("Asset index is empty");
  return manifest;
}
