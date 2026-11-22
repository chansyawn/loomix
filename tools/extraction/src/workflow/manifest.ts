import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { digest, hashFile } from "./hashing.ts";
import type { FileHash } from "./hashing.ts";
import { within } from "../paths.ts";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const STAGE_MANIFEST_VERSION = 2;
const fileHash = z
  .object({ path: z.string(), sha256: hash, bytes: z.number().int().nonnegative() })
  .strict();
const baseManifestSchema = z
  .object({
    schemaVersion: z.literal(STAGE_MANIFEST_VERSION),
    id: hash,
    status: z.literal("verified"),
    createdAt: z.string().datetime(),
    inputs: z.object({ id: hash, sha256: hash, files: z.array(fileHash) }).strict(),
    implementation: hash,
    profileHash: hash,
    tools: z.record(z.string(), z.string()),
    outputs: z.array(fileHash).nonempty(),
    result: z
      .object({
        passed: z.literal(true),
        validation: z.literal("passed"),
        failures: z.array(z.string()).length(0),
      })
      .strict(),
  })
  .strict();
const manifestSchema = z.discriminatedUnion("kind", [
  baseManifestSchema.extend({ kind: z.literal("environment"), clientSnapshotId: hash }),
  baseManifestSchema.extend({ kind: z.literal("extraction") }),
  baseManifestSchema.extend({ kind: z.literal("resource-package") }),
]);
export type Manifest = z.infer<typeof manifestSchema>;
export type StageManifest<Kind extends Manifest["kind"]> = Extract<Manifest, { kind: Kind }>;

export function stageManifestFile(kind: Manifest["kind"]): string {
  return `${kind}-manifest.json`;
}

export function atomicJson(file: string, value: object): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

export async function verifyFiles(root: string, outputs: FileHash[]): Promise<void> {
  const seen = new Set<string>();
  for (const output of outputs) {
    const file = within(root, output.path);
    if (seen.has(output.path)) throw new Error(`Duplicate manifest output: ${output.path}`);
    seen.add(output.path);
    if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular output: ${file}`);
    const actual = await hashFile(file);
    if (actual.sha256 !== output.sha256 || actual.bytes !== output.bytes)
      throw new Error(`Hash mismatch: ${file}`);
  }
}

function validateInputInventory(manifest: Manifest): void {
  if (digest(manifest.inputs.files) !== manifest.inputs.sha256)
    throw new Error("Manifest input inventory mismatch");
  if (
    manifest.kind === "environment" &&
    (manifest.clientSnapshotId !== manifest.inputs.id ||
      manifest.clientSnapshotId !== manifest.inputs.sha256)
  )
    throw new Error("Environment client snapshot identity mismatch");
}

export async function stageInputs(
  directory: string,
  upstream: Manifest,
): Promise<Manifest["inputs"]> {
  const file = stageManifestFile(upstream.kind);
  const files = [{ path: file, ...(await hashFile(within(directory, file))) }, ...upstream.outputs];
  return { id: upstream.id, sha256: digest(files), files };
}

export async function verifyStageInputs(
  manifest: Manifest,
  directory: string,
  upstream: Manifest,
): Promise<void> {
  const expected = await stageInputs(directory, upstream);
  if (manifest.inputs.id !== expected.id || manifest.inputs.sha256 !== expected.sha256)
    throw new Error(`${manifest.kind} input inventory does not match ${upstream.kind}`);
}

function hasKind<Kind extends Manifest["kind"]>(
  manifest: Manifest,
  kind: Kind,
): manifest is StageManifest<Kind> {
  return manifest.kind === kind;
}

export async function readManifest<Kind extends Manifest["kind"]>(
  directory: string,
  kind: Kind,
): Promise<StageManifest<Kind>> {
  const manifest = manifestSchema.parse(
    JSON.parse(fs.readFileSync(within(directory, stageManifestFile(kind)), "utf8")),
  );
  if (!hasKind(manifest, kind) || path.basename(directory) !== manifest.id)
    throw new Error("Manifest identity mismatch");
  validateInputInventory(manifest);
  await verifyFiles(directory, manifest.outputs);
  return manifest;
}

export async function publishManifest(directory: string, manifest: Manifest): Promise<void> {
  manifestSchema.parse(manifest);
  validateInputInventory(manifest);
  await verifyFiles(directory, manifest.outputs);
  atomicJson(path.join(directory, stageManifestFile(manifest.kind)), manifest);
}
