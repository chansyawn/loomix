import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { digest, hashFile } from "./hashing.ts";
import type { FileHash } from "./hashing.ts";
import { within } from "./paths.ts";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const fileHash = z
  .object({ path: z.string(), sha256: hash, bytes: z.number().int().nonnegative() })
  .strict();
export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.enum(["environment", "extraction", "delivery"]),
    id: hash,
    status: z.literal("verified"),
    createdAt: z.string().datetime(),
    inputs: z.object({ id: z.string(), sha256: hash, files: z.array(fileHash) }).strict(),
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
export type Manifest = z.infer<typeof manifestSchema>;

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

export async function readManifest(directory: string, kind: Manifest["kind"]): Promise<Manifest> {
  const manifest = manifestSchema.parse(
    JSON.parse(fs.readFileSync(within(directory, `${kind}-manifest.json`), "utf8")),
  );
  if (manifest.kind !== kind || path.basename(directory) !== manifest.id)
    throw new Error("Manifest identity mismatch");
  if (digest(manifest.inputs.files) !== manifest.inputs.sha256)
    throw new Error("Manifest input inventory mismatch");
  await verifyFiles(directory, manifest.outputs);
  return manifest;
}

export async function publishManifest(directory: string, manifest: Manifest): Promise<void> {
  manifestSchema.parse(manifest);
  await verifyFiles(directory, manifest.outputs);
  atomicJson(path.join(directory, `${manifest.kind}-manifest.json`), manifest);
}
