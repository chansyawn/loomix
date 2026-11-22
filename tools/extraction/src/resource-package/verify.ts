import assert from "node:assert/strict";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import { validateWebsiteResources } from "@loomix/resources/website-resources";
import type { VerifiedExtraction } from "../extraction/bundle.ts";
import { filesWithin } from "../workflow/hashing.ts";
import { readJson } from "../workflow/json.ts";
import { stageManifestFile, verifyStageInputs } from "../workflow/manifest.ts";
import type { StageManifest } from "../workflow/manifest.ts";
import {
  IMAGE_PROCESSING_REPORT_FILE,
  VALIDATION_FILE,
  WEBSITE_RESOURCE_DIRECTORY,
} from "./files.ts";

export async function validatePackageWebsite(directory: string, dataset: Dataset) {
  const content = await validateWebsiteResources(path.join(directory, WEBSITE_RESOURCE_DIRECTORY));
  assert.deepEqual(
    content.websiteResources.dataset,
    dataset,
    "Website resources must preserve the sealed game dataset",
  );
  return {
    validation: {
      passed: true,
      datasetId: dataset.context.datasetId,
      items: dataset.catalog.items.length,
      imageFileCount: content.imageFiles.length,
    },
    files: [
      ...[...content.documents, ...content.imageFiles].map(
        ({ key }) => `${WEBSITE_RESOURCE_DIRECTORY}/${key}`,
      ),
      IMAGE_PROCESSING_REPORT_FILE,
      VALIDATION_FILE,
    ].sort(),
  };
}

export function assertPackageFileSet(directory: string, expected: string[]): void {
  assert.deepEqual(
    filesWithin(directory)
      .filter((file) => file !== stageManifestFile("resource-package"))
      .sort(),
    expected,
    "Sealed resource package file set",
  );
}

export async function verifySealedResourcePackage(
  directory: string,
  manifest: StageManifest<"resource-package">,
  extraction: VerifiedExtraction,
): Promise<void> {
  await verifyStageInputs(manifest, extraction.directory, extraction.manifest);
  assert.equal(manifest.profileHash, extraction.manifest.profileHash, "Resource package profile");
  const { validation, files } = await validatePackageWebsite(directory, extraction.dataset);
  assert.deepEqual(
    manifest.outputs.map((file) => file.path).sort(),
    files,
    "Resource package manifest output file set",
  );
  assertPackageFileSet(directory, files);
  assert.deepEqual(
    readJson(path.join(directory, VALIDATION_FILE)),
    validation,
    "Resource package validation result",
  );
}
