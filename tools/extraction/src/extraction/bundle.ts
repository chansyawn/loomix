import fs from "node:fs";
import crypto from "node:crypto";
import { withLock } from "../workflow/lock.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { parseDataset } from "@loomix/schema/dataset";
import { EvidenceSchema } from "./evidence/domain-schema.ts";
import type { SourceObservations } from "./model.ts";
import {
  originalImageSchema,
  imageNeedSchema,
  imageObjectSchema,
  uniqueObjects,
} from "./images/model.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { filesWithin } from "../workflow/hashing.ts";
import { readManifest, publishManifest } from "../workflow/manifest.ts";
import type { Assembly } from "./assemble/index.ts";
import { assemble } from "./assemble/index.ts";

export function writeAssembly(directory: string, assembly: Assembly): void {
  writeJson(path.join(directory, "dataset.json"), assembly.dataset);
  writeJson(path.join(directory, "evidence.json"), assembly.evidence);
  writeJson(path.join(directory, "image-bindings.json"), assembly.imageBindings);
  writeJson(path.join(directory, "image-jobs.json"), assembly.imageJobs);
}

export function readCandidate(directory: string) {
  const observations = readJson<SourceObservations>(path.join(directory, "observations.json"));
  if (observations.version !== 1) throw new Error("Unsupported source observations");
  observations.imageNeeds = imageNeedSchema.array().parse(observations.imageNeeds);
  observations.imageObjects = imageObjectSchema.array().parse(observations.imageObjects);
  uniqueObjects(observations.imageObjects);
  const originals = originalImageSchema
    .array()
    .parse(readJson(path.join(directory, "originals.json")));
  const rebuilt = assemble(observations, originals);
  const dataset = parseDataset(readJson(path.join(directory, "dataset.json")));
  const evidence = EvidenceSchema.parse(readJson(path.join(directory, "evidence.json")));
  assert.deepEqual(dataset, rebuilt.dataset, "Dataset matches source observations");
  assert.deepEqual(evidence, rebuilt.evidence, "Evidence matches source observations");
  assert.deepEqual(
    readJson(path.join(directory, "image-bindings.json")),
    rebuilt.imageBindings,
    "Image bindings match observations and originals",
  );
  assert.deepEqual(
    readJson(path.join(directory, "image-jobs.json")),
    rebuilt.imageJobs,
    "Image jobs cover the exact reference graph",
  );
  return { directory, observations, originals, ...rebuilt };
}

export async function readVerifiedExtraction(directory: string) {
  const manifest = await readManifest(directory, "extraction");
  assert.deepEqual(
    filesWithin(directory)
      .filter((file) => file !== "extraction-manifest.json")
      .sort(),
    manifest.outputs.map((file) => file.path).sort(),
    "Sealed extraction file set",
  );
  const bundle = readCandidate(directory);
  assert.equal(bundle.dataset.context.snapshotId, manifest.id, "Sealed dataset identity");
  assert.equal(
    readJson<{ passed: boolean }>(path.join(directory, "validation.json")).passed,
    true,
    "Sealed acceptance result",
  );
  return { manifest, ...bundle };
}
export type VerifiedExtraction = Awaited<ReturnType<typeof readVerifiedExtraction>>;

export async function sealExtraction(
  directory: string,
  build: (staging: string) => Promise<import("../workflow/manifest.ts").Manifest>,
): Promise<void> {
  await withLock(`${directory}.lock`, async () => {
    if (fs.existsSync(directory)) {
      try {
        await readManifest(directory, "extraction");
      } catch {
        fs.renameSync(directory, `${directory}.corrupt-${crypto.randomUUID()}`);
      }
      if (fs.existsSync(directory)) {
        await readVerifiedExtraction(directory);
        return;
      }
    }
    fs.mkdirSync(path.dirname(directory), { recursive: true });
    const staging = fs.mkdtempSync(`${directory}.staging-`);
    try {
      const manifest = await build(staging);
      if (manifest.kind !== "extraction" || manifest.id !== path.basename(directory))
        throw new Error("Extraction seal identity mismatch");
      await publishManifest(staging, manifest);
      fs.renameSync(staging, directory);
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  });
}
