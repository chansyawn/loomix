import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { cacheRoot, identityDirectory } from "../paths.ts";
import {
  publishManifest,
  readManifest,
  STAGE_MANIFEST_VERSION,
  stageInputs,
  verifyStageInputs,
} from "../workflow/manifest.ts";
import type { StageManifest } from "../workflow/manifest.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { implementationRevision, profileHash } from "../workflow/identity.ts";
import { writeJson } from "../workflow/json.ts";
import { withLock } from "../workflow/lock.ts";
import { readVerifiedExtraction } from "../extraction/bundle.ts";
import { renderImages } from "./images.ts";
import {
  assertPackageFileSet,
  validatePackageWebsite,
  verifySealedResourcePackage,
} from "./verify.ts";
import { VALIDATION_FILE } from "./files.ts";

export async function buildResourcePackage(extractionId: string): Promise<string> {
  const extractionDirectory = identityDirectory("extractions", extractionId);
  const extraction = await readVerifiedExtraction(extractionDirectory);
  if (extraction.manifest.profileHash !== profileHash)
    throw new Error("Extraction profile differs from the current profile; extract again");
  const implementation = await implementationRevision();
  const inputs = await stageInputs(extractionDirectory, extraction.manifest);
  const resourcePackageId = digest({
    schemaVersion: STAGE_MANIFEST_VERSION,
    formatVersion: FORMAT_VERSION,
    extractionId,
    inputs: inputs.sha256,
    implementation,
    profileHash,
    imagePolicy: "Lanczos3-icon256-banner1024x512-illustration1600-cardOriginal-WebP85-alpha100-v5",
  });
  const directory = identityDirectory("resource-packages", resourcePackageId);
  await withLock(`${directory}.lock`, async () => {
    if (fs.existsSync(directory)) {
      try {
        await verifySealedResourcePackage(
          directory,
          await readManifest(directory, "resource-package"),
          extraction,
        );
        console.error(`Reusing verified resource package ${resourcePackageId}`);
        return;
      } catch {
        fs.renameSync(directory, `${directory}.corrupt-${crypto.randomUUID()}`);
      }
    }
    const staging = fs.mkdtempSync(`${directory}.staging-`);
    try {
      await renderImages(staging, extraction);
      const { validation, files } = await validatePackageWebsite(staging, extraction.dataset);
      writeJson(path.join(staging, VALIDATION_FILE), validation);
      assertPackageFileSet(staging, files);
      const manifest: StageManifest<"resource-package"> = {
        schemaVersion: STAGE_MANIFEST_VERSION,
        kind: "resource-package",
        id: resourcePackageId,
        status: "verified",
        createdAt: new Date().toISOString(),
        inputs,
        implementation,
        profileHash,
        tools: extraction.manifest.tools,
        outputs: await inventory(staging, files),
        result: { passed: true, validation: "passed", failures: [] },
      };
      await verifyStageInputs(
        manifest,
        extractionDirectory,
        (await readVerifiedExtraction(extractionDirectory)).manifest,
      );
      if ((await implementationRevision()) !== implementation)
        throw new Error("Implementation changed during resource packaging; rerun package");
      await publishManifest(staging, manifest);
      fs.renameSync(staging, directory);
    } catch (error) {
      const failures = path.join(cacheRoot(), "failures");
      fs.mkdirSync(failures, { recursive: true });
      const diagnostic = path.join(failures, path.basename(staging));
      const report = path.join(staging, "failure-report.json");
      writeJson(report, { passed: false, extractionId, resourcePackageId, error: String(error) });
      fs.renameSync(staging, diagnostic);
      throw new Error(
        `Resource packaging failed; see ${path.join(diagnostic, path.basename(report))}`,
        {
          cause: error,
        },
      );
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  });
  return resourcePackageId;
}
