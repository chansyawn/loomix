import { readManifest, resolveStage, verifyStageInputs } from "./workflow/manifest.ts";
import type { StageLocation, StageManifest } from "./workflow/manifest.ts";
import { verifyEnvironment } from "./environment/verify.ts";
import { verifyExtraction } from "./extraction/verify.ts";
import { verifySealedResourcePackage } from "./resource-package/verify.ts";

export async function verifyResourcePackage({
  directory,
  id,
}: StageLocation): Promise<StageManifest<"resource-package">> {
  const manifest = await readManifest(directory, "resource-package", id);
  const extractionStage = resolveStage("extraction", manifest.inputs.id);
  const extraction = await verifyExtraction(extractionStage.directory, extractionStage.id);
  const environmentStage = resolveStage("environment", extraction.manifest.inputs.id);
  const environment = await verifyEnvironment(environmentStage.directory, environmentStage.id);
  await verifyStageInputs(extraction.manifest, environmentStage.directory, environment);
  await verifySealedResourcePackage(directory, manifest, extraction);
  return manifest;
}
