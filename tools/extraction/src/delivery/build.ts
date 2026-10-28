import fs from "node:fs";
import path from "node:path";
import { identityDirectory, websiteDirectory } from "../paths.ts";
import { readManifest, publishManifest, atomicJson } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { digest, inventory, filesWithin } from "../workflow/hashing.ts";
import { implementationRevision, profileHash } from "../workflow/identity.ts";
import { withLock } from "../workflow/lock.ts";
import { renderImages } from "./images.ts";
import { verifyDelivery } from "./verify.ts";
import { publish, safeOutput } from "./publish.ts";
import { renderCollection } from "./collection.ts";

export async function deliver(
  extractionId: string,
  { artifactOnly = false } = {},
): Promise<string> {
  const bundle = identityDirectory("extractions", extractionId);
  const extraction = await readManifest(bundle, "extraction");
  if (extraction.profileHash !== profileHash)
    throw new Error("Extraction profile differs from the current profile; extract again");
  const collectionV4 = fs.existsSync(path.join(bundle, "raw/images-content-v5.json"));
  const target = artifactOnly ? "artifact-only" : "website";
  const implementation = await implementationRevision();
  const inputs = await inventory(bundle, [
    "extraction-manifest.json",
    "raw/content.json",
    "raw/neighbors.json",
    ...(fs.existsSync(path.join(bundle, "raw/islands.json")) ? ["raw/islands.json"] : []),
  ]);
  const id = digest({
    extractionId,
    inputs,
    implementation,
    profileHash,
    target,
    imagePolicy: "Lanczos3-cover-and-neighbor-inside1600-WebP85-alpha100-v2",
  });
  const work = identityDirectory("deliveries", id);
  await withLock(artifactOnly ? `${work}.lock` : `${websiteDirectory}.lock`, async () => {
    if (!artifactOnly) safeOutput(websiteDirectory);
    fs.mkdirSync(work, { recursive: true });
    const previousManifest = fs.existsSync(path.join(work, "delivery-manifest.json"))
      ? (JSON.parse(fs.readFileSync(path.join(work, "delivery-manifest.json"), "utf8")) as Manifest)
      : undefined;
    fs.rmSync(path.join(work, "delivery-manifest.json"), { force: true });
    fs.rmSync(path.join(work, "staging"), { recursive: true, force: true });
    const options = { work, output: websiteDirectory };
    try {
      await renderImages(options, bundle);
      if (collectionV4) await renderCollection(work, bundle);
      await verifyDelivery(work, bundle);
      atomicJson(path.join(work, "run-report.json"), {
        passed: true,
        extractionId,
        deliveryId: id,
        target,
      });
      const manifest: Manifest = {
        schemaVersion: 1,
        kind: "delivery",
        deliveryMode: target,
        id,
        status: "verified",
        createdAt: previousManifest?.createdAt ?? new Date().toISOString(),
        inputs: { id: extractionId, sha256: digest(inputs), files: inputs },
        implementation,
        profileHash,
        tools: extraction.tools,
        outputs: await inventory(
          work,
          filesWithin(work).filter(
            (file) =>
              !file.startsWith("logs/") &&
              !["run-report.json", "delivery-manifest.json"].includes(file),
          ),
        ),
        result: { passed: true, validation: "passed", failures: [] },
      };
      // Re-read the sealed extraction before publication in case it changed during image processing.
      await readManifest(bundle, "extraction");
      if ((await implementationRevision()) !== implementation)
        throw new Error("Implementation changed during delivery; rerun deliver");
      await publishManifest(work, manifest);
      if (!artifactOnly) await publish(options);
    } catch (error) {
      fs.rmSync(path.join(work, "delivery-manifest.json"), { force: true });
      atomicJson(path.join(work, "run-report.json"), {
        passed: false,
        extractionId,
        deliveryId: id,
        failure: String(error),
      });
      throw error;
    }
  });
  return id;
}
