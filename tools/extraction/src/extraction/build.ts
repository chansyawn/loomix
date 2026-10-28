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
import { admissionsFile, parseAdmissions } from "./content/admissions.ts";
import { finalizeEvidence } from "./evidence/build.ts";
import { exportNeighborImages } from "./neighbors/images.ts";
import { buildNeighbors } from "./neighbors/build.ts";
import { buildCollection } from "./collection/build.ts";
import { exportSeedImages } from "./collection/images.ts";
import { buildIslands } from "./islands/build.ts";
import { exportIslandImages } from "./islands/images.ts";

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
  const admissionsBytes = fs.readFileSync(
    new URL("./content/supplemental-admissions.json", import.meta.url),
  );
  const admissions = parseAdmissions(admissionsBytes);
  const id = digest({
    environmentId,
    inputs: digest(inputs),
    profileHash,
    implementation,
    admissions: admissions.sha256,
  });
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
          name: "admissions",
          dependencies: [],
          run: async () => {
            fs.writeFileSync(path.join(work, admissionsFile), admissionsBytes);
          },
          outputs: () => [admissionsFile],
        },
        {
          name: "decode",
          dependencies: [],
          run: () => prepareSource(options),
          outputs: () => [...tree("prepared"), ...tree("bindata"), "bindata-manifest.json"],
        },
        {
          name: "structure",
          dependencies: ["decode", "admissions"],
          run: () => structure(options),
          outputs: () => [
            "raw/content.json",
            "scope.json",
            "record-evidence.json",
            "quality-enum.json",
            "candidate-images.json",
            "field-evidence.json",
            "missing-fields.json",
            "outside-members.json",
            "field-candidates.json",
            "field-investigation.json",
            "cooking-audit.json",
            "cooking-evidence.json",
            "cooking-investigation.json",
          ],
        },
        {
          name: "neighbors",
          dependencies: ["structure"],
          run: () => buildNeighbors(work),
          outputs: () => ["raw/neighbors.json", "neighbor-audit.json", "neighbor-exclusions.json"],
        },
        {
          name: "islands",
          dependencies: ["structure"],
          run: async () => buildIslands(work),
          outputs: () => ["raw/islands.json", "island-audit.json", "island-exclusions.json"],
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
          name: "collection",
          dependencies: ["raw-assets"],
          run: async () => buildCollection(work),
          outputs: () => [
            "raw/content-v5.json",
            "collection-evidence.json",
            "seed-image-candidates.json",
            "stage-image-candidates.json",
            "crafting-audit.json",
            "collection-missing-fields.json",
            "collection-investigation.json",
          ],
        },
        {
          name: "seed-images",
          dependencies: ["collection"],
          run: () => exportSeedImages(options),
          outputs: () => [
            ...tree("seed-exports"),
            ...tree("stage-exports"),
            "seed-image-originals.json",
            "seed-image-manifest.json",
            "stage-image-originals.json",
            "stage-image-manifest.json",
            "raw/images-content-v5.json",
          ],
        },
        {
          name: "neighbor-images",
          dependencies: ["neighbors", "raw-assets"],
          run: () => exportNeighborImages(options),
          outputs: () => [
            ...tree("neighbor-exports"),
            "neighbor-image-exports.json",
            "neighbor-additional-image-exports.json",
            "neighbor-image-audit.json",
          ],
        },
        {
          name: "island-images",
          dependencies: ["islands", "raw-assets"],
          run: () => exportIslandImages(options),
          outputs: () => [
            "island-image-exports.json",
            "island-image-audit.json",
            ...tree("island-exports"),
          ],
        },
        {
          name: "source-audit",
          dependencies: ["neighbor-images", "island-images", "seed-images"],
          run: () => audit(options),
          outputs: () => ["source-audit.json"],
        },
        {
          name: "extraction-verify",
          dependencies: ["source-audit", "neighbors", "islands", "island-images"],
          run: async () => {
            finalizeEvidence(work);
            await verifyExtraction(work);
          },
          outputs: () => [
            ...tree("evidence"),
            "coverage.json",
            "collection-coverage.json",
            "validation.json",
          ],
        },
      ]);
      await assertClientUnchanged(environment);
      // Verification is repeated on reuse, independently of checkpoint markers.
      await verifyExtraction(work);
      atomicJson(path.join(work, "run-report.json"), {
        passed: true,
        environmentId,
        extractionId: id,
        checkpoints: [
          "admissions",
          "decode",
          "structure",
          "neighbors",
          "islands",
          "raw-assets",
          "collection",
          "seed-images",
          "neighbor-images",
          "island-images",
          "source-audit",
          "extraction-verify",
        ],
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
