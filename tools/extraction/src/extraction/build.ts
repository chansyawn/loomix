import fs from "node:fs";
import path from "node:path";
import { identityDirectory } from "../paths.ts";
import { readManifest, publishManifest, atomicJson } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { digest, filesWithin, inventory } from "../workflow/hashing.ts";
import { implementationRevision, profileHash, toolIdentity } from "../workflow/identity.ts";
import { runCheckpoints } from "../workflow/checkpoint.ts";
import { ensureAnimeStudio } from "../client/anime-studio/index.ts";
import { withLock } from "../workflow/lock.ts";
import { assertClientUnchanged } from "../client/snapshot.ts";
import { prepareSource } from "./source.ts";
import { structure } from "./content/assemble.ts";
import { exportImages } from "./images/export.ts";
import { audit } from "./audit.ts";
import { verifyExtraction } from "./verify.ts";
import { finalizeEvidence } from "./evidence/build.ts";

export async function extract(environmentId: string): Promise<string> {
  const environmentDirectory = identityDirectory("environments", environmentId);
  const environment = await readManifest(environmentDirectory, "environment");
  if (
    environment.profileHash !== profileHash ||
    environment.tools.animeStudioInput !== digest(toolIdentity())
  )
    throw new Error("Environment profile/tool changed; run init");
  if (environment.tools.animeStudio !== (await ensureAnimeStudio()))
    throw new Error("Initialized tool bytes changed; run init again");
  await assertClientUnchanged(environment);
  const implementation = await implementationRevision();
  const inputs = await inventory(environmentDirectory, [
    "environment-manifest.json",
    ...environment.outputs.map((file) => file.path),
  ]);
  const id = digest({ environmentId, inputs: digest(inputs), profileHash, implementation });
  const work = identityDirectory("extractions", id);
  await withLock(`${work}.lock`, async () => {
    fs.mkdirSync(work, { recursive: true });
    const manifestFile = path.join(work, "extraction-manifest.json");
    const previous = fs.existsSync(manifestFile)
      ? (JSON.parse(fs.readFileSync(manifestFile, "utf8")) as Manifest)
      : undefined;
    fs.rmSync(manifestFile, { force: true });
    const tree = (directory: string) =>
      filesWithin(path.join(work, directory)).map((file) => `${directory}/${file}`);
    const options = { work, environment: environmentDirectory };
    try {
      await runCheckpoints(work, id, [
        {
          name: "decode",
          dependencies: [],
          run: () => prepareSource(options),
          outputs: () => [...tree("prepared"), ...tree("bindata"), "bindata-manifest.json"],
        },
        {
          name: "structure",
          dependencies: ["decode"],
          run: () => structure(options),
          outputs: () => [
            "raw/content.json",
            "scope.json",
            "quality-enum.json",
            "candidate-images.json",
            "field-evidence.json",
            "missing-fields.json",
            "outside-members.json",
            "field-candidates.json",
            "field-investigation.json",
          ],
        },
        {
          name: "raw-assets",
          dependencies: ["structure"],
          run: () => exportImages(options),
          outputs: () => [
            ...tree("exports"),
            "raw/images-content.json",
            "image-candidates.json",
            "selected-images.json",
            "image-manifest.json",
            "image-field-evidence.json",
          ],
        },
        {
          name: "source-audit",
          dependencies: ["raw-assets"],
          run: () => audit(options),
          outputs: () => ["source-audit.json"],
        },
        {
          name: "extraction-verify",
          dependencies: ["source-audit"],
          run: async () => {
            finalizeEvidence(work);
            await verifyExtraction(work);
          },
          outputs: () => [...tree("evidence"), "coverage.json", "validation.json"],
        },
      ]);
      await assertClientUnchanged(environment);
      // Verification is repeated on reuse, independently of checkpoint markers.
      await verifyExtraction(work);
      atomicJson(path.join(work, "run-report.json"), {
        passed: true,
        environmentId,
        extractionId: id,
        checkpoints: ["decode", "structure", "raw-assets", "source-audit", "extraction-verify"],
      });
      const manifest: Manifest = {
        schemaVersion: 1,
        kind: "extraction",
        id,
        status: "verified",
        createdAt: previous?.createdAt ?? new Date().toISOString(),
        inputs: { id: environmentId, sha256: digest(inputs), files: inputs },
        implementation,
        profileHash,
        tools: environment.tools,
        outputs: await inventory(
          work,
          filesWithin(work).filter(
            (file) =>
              !file.startsWith("logs/") &&
              !file.startsWith("checkpoints/") &&
              !["run-report.json", "extraction-manifest.json", "created.json"].includes(file),
          ),
        ),
        result: { passed: true, validation: "passed", failures: [] },
      };
      if ((await implementationRevision()) !== implementation)
        throw new Error("Implementation changed during extract; rerun extract");
      await publishManifest(work, manifest);
    } catch (error) {
      atomicJson(path.join(work, "run-report.json"), {
        passed: false,
        environmentId,
        extractionId: id,
        failure: String(error),
      });
      throw error;
    }
  });
  return id;
}
