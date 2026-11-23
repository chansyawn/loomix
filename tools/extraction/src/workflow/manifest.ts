import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { digest, hashFile } from "./hashing.ts";
import type { FileHash } from "./hashing.ts";
import { artifactsRoot, assertIdentity, within } from "../paths.ts";
import { clientVersionLabelPattern } from "../client/versions.ts";
import { errorCode } from "./errors.ts";
import { ExtractionIdentitySchema, extractionId } from "./extraction-identity.ts";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const STAGE_MANIFEST_VERSION = 7;
const fileHash = z
  .object({ path: z.string(), sha256: hash, bytes: z.number().int().nonnegative() })
  .strict();
const baseManifestSchema = z
  .object({
    stageManifestVersion: z.literal(STAGE_MANIFEST_VERSION, {
      error: "提取阶段清单版本不受支持。请运行 refresh 重新生成，并使用新的阶段 ID。",
    }),
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
  baseManifestSchema.extend({
    kind: z.literal("extraction"),
    identityInputs: ExtractionIdentitySchema,
  }),
  baseManifestSchema.extend({ kind: z.literal("resource-package") }),
]);
export type Manifest = z.infer<typeof manifestSchema>;
export type StageManifest<Kind extends Manifest["kind"]> = Extract<Manifest, { kind: Kind }>;
type StageKind = Manifest["kind"];
export interface StageLocation {
  id: string;
  directory: string;
}

const stageFolders = {
  environment: "environments",
  extraction: "extractions",
  "resource-package": "resource-packages",
} as const;
const prefixLength = 12;
const shortId = `--[a-f0-9]{${prefixLength}}`;
const namedStage = new RegExp(`^(${clientVersionLabelPattern})${shortId}$`);
const namedPackage = new RegExp(`^${clientVersionLabelPattern}-f\\d+${shortId}$`);

function stageNameMatches(kind: StageKind, name: string): boolean {
  return (kind === "resource-package" ? namedPackage : namedStage).test(name);
}

function stageSuffix(id: string): string {
  return `--${id.slice(0, prefixLength)}`;
}

export function stageOutput(kind: StageKind, id: string, upstreamDirectory: string): StageLocation {
  assertIdentity(id, kind);
  const version = namedStage.exec(path.basename(upstreamDirectory))?.[1];
  if (!version) throw new Error(`Invalid upstream directory name: ${upstreamDirectory}`);
  const label = kind === "resource-package" ? `${version}-f${FORMAT_VERSION}` : version;
  return {
    id,
    directory: within(artifactsRoot(), `${stageFolders[kind]}/${label}${stageSuffix(id)}`),
  };
}

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
  if (manifest.kind === "extraction") {
    const identity = manifest.identityInputs;
    if (
      identity.stageManifestVersion !== manifest.stageManifestVersion ||
      identity.environmentId !== manifest.inputs.id ||
      identity.inputs !== manifest.inputs.sha256 ||
      identity.profileHash !== manifest.profileHash ||
      identity.implementation !== manifest.implementation ||
      identity.tool !== manifest.tools.animeStudio ||
      extractionId(identity) !== manifest.id
    )
      throw new Error("Extraction manifest identity inputs mismatch");
  }
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

function hasKind<Kind extends StageKind>(
  manifest: Manifest,
  kind: Kind,
): manifest is StageManifest<Kind> {
  return manifest.kind === kind;
}

function readManifestJson(directory: string, kind: StageKind): unknown {
  const file = within(directory, stageManifestFile(kind));
  if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular stage manifest: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readManifestHeader<Kind extends StageKind>(
  directory: string,
  kind: Kind,
): StageManifest<Kind> {
  const manifest = manifestSchema.parse(readManifestJson(directory, kind));
  const name = path.basename(directory);
  if (
    !hasKind(manifest, kind) ||
    !stageNameMatches(kind, name) ||
    !name.endsWith(stageSuffix(manifest.id))
  )
    throw new Error("Manifest identity mismatch");
  validateInputInventory(manifest);
  return manifest;
}

export function resolveStage(kind: StageKind, reference: string): StageLocation {
  if (stageNameMatches(kind, reference)) {
    const directory = within(artifactsRoot(), `${stageFolders[kind]}/${reference}`);
    return { directory, id: readManifestHeader(directory, kind).id };
  }
  assertIdentity(reference, kind);
  const root = within(artifactsRoot(), stageFolders[kind]);
  let names: string[];
  try {
    names = fs.readdirSync(root).sort();
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
    names = [];
  }
  const matches: StageLocation[] = [];
  const errors: unknown[] = [];
  for (const name of names) {
    if (!stageNameMatches(kind, name) || !name.endsWith(stageSuffix(reference))) continue;
    try {
      const directory = within(root, name);
      if (readManifestHeader(directory, kind).id === reference)
        matches.push({ id: reference, directory });
    } catch (error) {
      errors.push(error);
    }
  }
  if (matches.length > 1)
    throw new Error(
      `Duplicate ${kind} ID ${reference}: ${matches.map(({ directory }) => directory).join(", ")}`,
    );
  if (matches.length === 1) return matches[0];
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, `Cannot open ${kind}: ${reference}`);
  throw new Error(`Missing ${kind}: ${reference}`);
}

const stageIdentity = z.object({ kind: z.string(), id: hash });

export function assertStageDestination(kind: StageKind, { id, directory }: StageLocation): void {
  assertIdentity(id, kind);
  const name = path.basename(directory);
  if (!stageNameMatches(kind, name) || !name.endsWith(stageSuffix(id)))
    throw new Error(`Invalid ${kind} output directory: ${directory}`);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(directory);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return;
    throw error;
  }
  if (!stat.isDirectory()) throw new Error(`Invalid ${kind} output directory: ${directory}`);
  let existing: z.infer<typeof stageIdentity>;
  try {
    existing = stageIdentity.parse(readManifestJson(directory, kind));
  } catch (error) {
    throw new Error(`Cannot establish identity of ${directory}; move it aside before rebuilding`, {
      cause: error,
    });
  }
  if (existing.kind !== kind || existing.id !== id)
    throw new Error(`Stage directory collision: ${directory} (${existing.id}, ${id})`);
}

export async function readManifest<Kind extends StageKind>(
  directory: string,
  kind: Kind,
  expectedId?: string,
): Promise<StageManifest<Kind>> {
  const manifest = readManifestHeader(directory, kind);
  if (expectedId !== undefined && manifest.id !== expectedId)
    throw new Error("Manifest identity mismatch");
  await verifyFiles(directory, manifest.outputs);
  return manifest;
}

export async function publishManifest(directory: string, manifest: Manifest): Promise<void> {
  manifestSchema.parse(manifest);
  validateInputInventory(manifest);
  await verifyFiles(directory, manifest.outputs);
  atomicJson(path.join(directory, stageManifestFile(manifest.kind)), manifest);
}
