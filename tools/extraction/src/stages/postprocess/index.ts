import fs from "node:fs";
import path from "node:path";
import { identityDirectory } from "../../paths.ts";
import { readManifest, publishManifest, atomicJson } from "../../workflow/manifest.ts";
import type { Manifest } from "../../workflow/manifest.ts";
import { digest, inventory, filesWithin } from "../../workflow/hashing.ts";
import { implementationRevision, profileHash } from "../../workflow/identity.ts";
import { withLock } from "../../workflow/lock.ts";
import { repoRoot } from "../../paths.ts";
import { postprocessImages } from "../../tasks/content/postprocess-images.ts";
import { validate } from "../../tasks/content/validate.ts";
import { publish, safeOutput } from "../../tasks/content/publication.ts";

export const websiteDirectory = path.join(repoRoot, "resources/website");

export async function postprocess(extractionId: string): Promise<string> {
  const bundle = identityDirectory("runs", extractionId);
  const extraction = await readManifest(bundle, "extraction");
  if (extraction.profileHash !== profileHash)
    throw new Error("Extraction profile differs from the current profile; extract again");
  const implementation = await implementationRevision();
  const inputs = await inventory(bundle, ["extraction-manifest.json"]);
  const id = digest({
    extractionId,
    inputs,
    implementation,
    profileHash,
    target: "website",
    imagePolicy: "Lanczos3-cover-WebP85-alpha100-v1",
  });
  const work = identityDirectory("deliveries", id);
  await withLock(`${websiteDirectory}.lock`, async () => {
    safeOutput(websiteDirectory);
    fs.mkdirSync(work, { recursive: true });
    const previousManifest = fs.existsSync(path.join(work, "delivery-manifest.json"))
      ? (JSON.parse(fs.readFileSync(path.join(work, "delivery-manifest.json"), "utf8")) as Manifest)
      : undefined;
    fs.rmSync(path.join(work, "delivery-manifest.json"), { force: true });
    fs.rmSync(path.join(work, "staging"), { recursive: true, force: true });
    const options = { work, output: websiteDirectory };
    try {
      await postprocessImages(options, bundle);
      await validate(options, bundle);
      atomicJson(path.join(work, "run-report.json"), {
        passed: true,
        extractionId,
        deliveryId: id,
        target: "website",
      });
      const manifest: Manifest = {
        schemaVersion: 1,
        kind: "delivery",
        id,
        status: "verified",
        createdAt: previousManifest?.createdAt ?? new Date().toISOString(),
        inputs: { id: extractionId, sha256: digest(inputs), files: inputs },
        implementation,
        profileHash,
        tools: { ...extraction.tools, sharp: "0.35.5" },
        outputs: await inventory(
          work,
          filesWithin(work).filter((file) => file !== "delivery-manifest.json"),
        ),
        result: { passed: true, validation: "passed", failures: [] },
      };
      // Re-read the sealed extraction before publication in case it changed during image processing.
      await readManifest(bundle, "extraction");
      if ((await implementationRevision()) !== implementation)
        throw new Error("Implementation changed during postprocess; rerun postprocess");
      await publishManifest(work, manifest);
      await publish(options, (request) => validate(request, bundle, false, false));
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
