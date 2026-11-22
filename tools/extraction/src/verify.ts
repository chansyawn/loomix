import { readManifest, verifyStageInputs } from "./workflow/manifest.ts";
import type { StageManifest } from "./workflow/manifest.ts";
import { identityDirectory } from "./paths.ts";
import { verifyEnvironment } from "./environment/verify.ts";
import { verifyExtraction } from "./extraction/verify.ts";
import { verifySealedResourcePackage } from "./resource-package/verify.ts";

export async function verifyResourcePackage(
  resourcePackageId: string,
): Promise<StageManifest<"resource-package">> {
  const directory = identityDirectory("resource-packages", resourcePackageId);
  const manifest = await readManifest(directory, "resource-package");
  const extractionDirectory = identityDirectory("extractions", manifest.inputs.id);
  const extraction = await verifyExtraction(extractionDirectory);
  const environmentDirectory = identityDirectory("environments", extraction.manifest.inputs.id);
  const environment = await verifyEnvironment(environmentDirectory);
  await verifyStageInputs(extraction.manifest, environmentDirectory, environment);
  await verifySealedResourcePackage(directory, manifest, extraction);
  return manifest;
}
