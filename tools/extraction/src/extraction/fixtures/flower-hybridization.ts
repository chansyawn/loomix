import path from "node:path";
import { FORMAT_VERSION } from "@loomix/schema/common";
import type { Source } from "@loomix/schema/common";
import {
  flowerHybridizationFile,
  parseFlowerHybridization,
} from "../external/flower-hybridization.ts";
import { admissionsFile } from "../source/catalog/admissions.ts";
import { vignetteHintsFile } from "../source/vignettes/profile.ts";
import { digest } from "../../workflow/hashing.ts";
import type { ExtractionIdentity } from "../../workflow/extraction-identity.ts";
import { writeJson } from "../../workflow/json.ts";
import { STAGE_MANIFEST_VERSION } from "../../workflow/manifest.ts";
import type { Manifest } from "../../workflow/manifest.ts";

export function flowerInputFixture({ gameVersion, dataRevision }: Source, recipes: unknown[] = []) {
  return { target: { gameVersion, dataRevision }, recipes };
}

function flowerFixtureBytes(source: Source, recipes: unknown[] = []) {
  return Buffer.from(JSON.stringify(flowerInputFixture(source, recipes), null, 2) + "\n");
}

export function emptyFlowerHybridization(source: Source) {
  return parseFlowerHybridization(flowerFixtureBytes(source), source);
}

export function freezeFlowerFixture(directory: string, source: Source, recipes: unknown[] = []) {
  const input = flowerInputFixture(source, recipes);
  const file = path.join(directory, "source", flowerHybridizationFile);
  writeJson(file, input);
  return parseFlowerHybridization(flowerFixtureBytes(source, recipes), source);
}

export function extractionIdentityFixture(
  inputs: Manifest["inputs"],
  {
    profileHash,
    implementation,
    tools,
  }: Pick<Manifest, "profileHash" | "implementation" | "tools">,
  sha256: string,
): ExtractionIdentity {
  return {
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    formatVersion: FORMAT_VERSION,
    environmentId: inputs.id,
    inputs: inputs.sha256,
    profileHash,
    implementation,
    tool: tools.animeStudio!,
    admissions: digest("{}\n"),
    vignetteHints: digest("{}\n"),
    external: [{ path: `source/${flowerHybridizationFile}`, sha256 }],
  };
}

export function freezeAdmissionsFixture(directory: string): void {
  for (const file of [admissionsFile, vignetteHintsFile])
    writeJson(path.join(directory, "source", file), {});
}
