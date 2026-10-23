import path from "node:path";
import { digest, inventory } from "../workflow/hashing.ts";
import type { FileHash } from "../workflow/hashing.ts";
import { verifyFiles } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { repoRoot } from "../paths.ts";

export const clientRoot = path.resolve(repoRoot, "resources/game-client");

export interface ClientSnapshot {
  files: FileHash[];
  sha256: string;
}

export async function snapshotClient(): Promise<ClientSnapshot> {
  const files = await inventory(clientRoot);
  return { files, sha256: digest(files) };
}

export async function assertClientUnchanged(environment: Manifest): Promise<void> {
  await verifyFiles(clientRoot, environment.inputs.files);
  const files = await inventory(clientRoot);
  if (digest(files) !== environment.inputs.sha256)
    throw new Error("Client snapshot changed; run init again");
}
