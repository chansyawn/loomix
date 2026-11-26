import fs from "node:fs";
import crypto from "node:crypto";
import { withLock } from "../workflow/lock.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { ContextSchema } from "@loomix/schema/common";
import { parseDataset } from "@loomix/schema/dataset";
import { FieldEvidenceReportSchema } from "./evidence/domain-schema.ts";
import type { ClientReadRecords } from "./model.ts";
import { acquisitionHintsSchema } from "./source/catalog/acquisition-hints.ts";
import { dyeingDiagnosticsSchema } from "./source/hair-dyeing/read.ts";
import { CLIENT_READ_RECORDS_FILE, DATASET_FILE, FIELD_EVIDENCE_FILE } from "./files.ts";
import {
  originalImageSchema,
  imageNeedSchema,
  imageObjectSchema,
  uniqueObjects,
} from "./images/model.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { filesWithin } from "../workflow/hashing.ts";
import {
  assertStageDestination,
  readManifest,
  publishManifest,
  stageManifestFile,
} from "../workflow/manifest.ts";
import type { Manifest, StageLocation } from "../workflow/manifest.ts";
import type { Assembly } from "./assemble/index.ts";
import { assemble } from "./assemble/index.ts";
import {
  flowerHybridizationFile,
  parseFlowerHybridization,
} from "./external/flower-hybridization.ts";
import {
  admissionsFile,
  appearanceInvestigationSchema,
  recordEvidenceSchema,
} from "./source/catalog/admissions.ts";
import { vignetteHintsFile } from "./source/vignettes/profile.ts";

export function writeAssembly(directory: string, assembly: Assembly): void {
  writeJson(path.join(directory, DATASET_FILE), assembly.dataset);
  writeJson(path.join(directory, FIELD_EVIDENCE_FILE), assembly.fieldEvidence);
  writeJson(path.join(directory, "image-bindings.json"), assembly.imageBindings);
  writeJson(path.join(directory, "image-jobs.json"), assembly.imageJobs);
}

export function readCandidate(directory: string) {
  const clientReadRecords = readJson<ClientReadRecords>(
    path.join(directory, CLIENT_READ_RECORDS_FILE),
  );
  if (!ContextSchema.safeParse(clientReadRecords.context).success)
    throw new Error("封存的提取结果与当前契约不符，请重新提取。");
  if (!clientReadRecords.vignettes) throw new Error("Missing vignette client read records");
  if (!clientReadRecords.hairDyeing) throw new Error("Missing hair dyeing client read records");
  dyeingDiagnosticsSchema.parse(clientReadRecords.hairDyeing.diagnostics);
  acquisitionHintsSchema.parse(clientReadRecords.diagnostics?.investigation?.acquisitionHints);
  recordEvidenceSchema.array().parse(clientReadRecords.diagnostics?.admissions);
  appearanceInvestigationSchema
    .array()
    .parse(clientReadRecords.diagnostics?.investigation?.appearances);
  clientReadRecords.imageNeeds = imageNeedSchema.array().parse(clientReadRecords.imageNeeds);
  clientReadRecords.imageObjects = imageObjectSchema.array().parse(clientReadRecords.imageObjects);
  uniqueObjects(clientReadRecords.imageObjects);
  const originals = originalImageSchema
    .array()
    .parse(readJson(path.join(directory, "originals.json")));
  const flowerHybridization = parseFlowerHybridization(
    fs.readFileSync(path.join(directory, "source", flowerHybridizationFile)),
    clientReadRecords.source,
  );
  const rebuilt = assemble(clientReadRecords, originals, flowerHybridization);
  const dataset = parseDataset(readJson(path.join(directory, DATASET_FILE)));
  const fieldEvidence = FieldEvidenceReportSchema.parse(
    readJson(path.join(directory, FIELD_EVIDENCE_FILE)),
  );
  assert.deepEqual(dataset, rebuilt.dataset, "Dataset matches frozen inputs");
  assert.deepEqual(fieldEvidence, rebuilt.fieldEvidence, "Field evidence matches frozen inputs");
  assert.deepEqual(
    readJson(path.join(directory, "image-bindings.json")),
    rebuilt.imageBindings,
    "Image bindings match client read records and originals",
  );
  assert.deepEqual(
    readJson(path.join(directory, "image-jobs.json")),
    rebuilt.imageJobs,
    "Image jobs cover the exact reference graph",
  );
  return { directory, clientReadRecords, originals, flowerHybridization, ...rebuilt };
}

export async function readVerifiedExtraction(directory: string, expectedId?: string) {
  const manifest = await readManifest(directory, "extraction", expectedId);
  assert.deepEqual(
    filesWithin(directory)
      .filter((file) => file !== stageManifestFile("extraction"))
      .sort(),
    manifest.outputs.map((file) => file.path).sort(),
    "Sealed extraction file set",
  );
  const bundle = readCandidate(directory);
  const { admissions, vignetteHints, external } = manifest.identityInputs;
  const hashes = new Map(manifest.outputs.map((file) => [file.path, file.sha256]));
  assert.equal(hashes.get(`source/${admissionsFile}`), admissions, "Frozen admissions identity");
  assert.equal(
    hashes.get(`source/${vignetteHintsFile}`),
    vignetteHints,
    "Frozen vignette hints identity",
  );
  assert.deepEqual(
    external,
    [{ path: `source/${flowerHybridizationFile}`, sha256: bundle.flowerHybridization.sha256 }],
    "Frozen external input identity",
  );
  assert.equal(bundle.dataset.context.datasetId, manifest.id, "Sealed dataset identity");
  const validation = readJson<{ passed: boolean; datasetId: string }>(
    path.join(directory, "validation.json"),
  );
  assert.equal(validation.passed, true, "Sealed acceptance result");
  assert.equal(validation.datasetId, manifest.id, "Sealed acceptance dataset identity");
  return { manifest, ...bundle };
}
export type VerifiedExtraction = Awaited<ReturnType<typeof readVerifiedExtraction>>;

export async function sealExtraction(
  destination: StageLocation,
  build: (staging: string) => Promise<Manifest>,
): Promise<void> {
  const { directory, id } = destination;
  await withLock(`${directory}.lock`, async () => {
    assertStageDestination("extraction", destination);
    if (fs.existsSync(directory)) {
      try {
        await readVerifiedExtraction(directory, id);
        return;
      } catch {
        fs.renameSync(directory, `${directory}.corrupt-${crypto.randomUUID()}`);
      }
    }
    fs.mkdirSync(path.dirname(directory), { recursive: true });
    const staging = fs.mkdtempSync(`${directory}.staging-`);
    try {
      const manifest = await build(staging);
      if (manifest.kind !== "extraction" || manifest.id !== id)
        throw new Error("Extraction seal identity mismatch");
      await publishManifest(staging, manifest);
      fs.renameSync(staging, directory);
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  });
}
