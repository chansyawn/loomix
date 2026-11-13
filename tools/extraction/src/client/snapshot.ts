import fs from "node:fs";
import path from "node:path";
import { clientsRoot, selectionsRoot, within } from "../paths.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import type { FileHash } from "../workflow/hashing.ts";
import { atomicJson } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { withLock } from "../workflow/lock.ts";
import { copyTree } from "../workflow/copy.ts";
import { z } from "zod";

export interface ClientSnapshot {
  files: FileHash[];
  sha256: string;
}

interface SnapshotManifest {
  schemaVersion: 1;
  id: string;
  files: FileHash[];
}

interface ClientSelection {
  schemaVersion: 1;
  snapshotId: string;
}

const snapshotManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-f0-9]{64}$/),
  files: z.array(
    z.object({
      path: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number().int().nonnegative(),
    }),
  ),
});

function snapshotDirectory(snapshotId: string): string {
  if (!/^[a-f0-9]{64}$/.test(snapshotId)) throw new Error("Invalid client snapshot ID");
  return within(clientsRoot(), snapshotId);
}

function readSnapshotManifest(snapshotId: string): SnapshotManifest {
  const directory = snapshotDirectory(snapshotId);
  const manifestFile = within(directory, "snapshot-manifest.json");
  const manifest = snapshotManifestSchema.parse(JSON.parse(fs.readFileSync(manifestFile, "utf8")));
  if (
    manifest.schemaVersion !== 1 ||
    manifest.id !== snapshotId ||
    digest(manifest.files) !== snapshotId
  )
    throw new Error(`Client snapshot manifest is invalid: ${snapshotId}`);
  return manifest;
}

function makeSnapshotReadOnly(root: string): void {
  const directories: string[] = [];
  const visit = (directory: string) => {
    directories.push(directory);
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name);
      if (fs.lstatSync(file).isDirectory()) visit(file);
      else fs.chmodSync(file, 0o444);
    }
  };
  visit(path.join(root, "game-client"));
  fs.chmodSync(path.join(root, "snapshot-manifest.json"), 0o444);
  for (const directory of directories.reverse()) fs.chmodSync(directory, 0o555);
  fs.chmodSync(root, 0o555);
}

function removeSnapshot(root: string): void {
  if (!fs.existsSync(root)) return;
  const makeWritable = (directory: string) => {
    fs.chmodSync(directory, 0o755);
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name);
      if (fs.lstatSync(file).isDirectory()) makeWritable(file);
      else fs.chmodSync(file, 0o644);
    }
  };
  makeWritable(root);
  fs.rmSync(root, { recursive: true, force: true });
}

export function selectedSnapshotId(): string {
  const file = within(selectionsRoot(), "client.json");
  let selection: ClientSelection;
  try {
    selection = JSON.parse(fs.readFileSync(file, "utf8")) as ClientSelection;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      throw new Error("No client snapshot selected; run client import and client select first");
    throw error;
  }
  if (selection.schemaVersion !== 1) throw new Error("Client selection version is unsupported");
  readSnapshotManifest(selection.snapshotId);
  return selection.snapshotId;
}

export function clientRoot(snapshotId = selectedSnapshotId()): string {
  const root = within(snapshotDirectory(snapshotId), "game-client");
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory())
    throw new Error(`Client snapshot directory is missing: ${root}`);
  return root;
}

export function resolveClientPath(relative: string, snapshotId?: string): string {
  const prefix = "resources/game-client/";
  const portable = relative.startsWith(prefix) ? relative.slice(prefix.length) : relative;
  if (path.isAbsolute(portable) || portable.includes("\\"))
    throw new Error(`Invalid client-relative path: ${relative}`);
  const root = clientRoot(snapshotId);
  const resolved = path.resolve(root, portable);
  const fromRoot = path.relative(root, resolved);
  if (
    !fromRoot ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(fromRoot)
  )
    throw new Error(`Client path escapes its snapshot: ${relative}`);
  return resolved;
}

export async function snapshotClient(root = clientRoot()): Promise<ClientSnapshot> {
  const files = await inventory(root);
  return { files, sha256: digest(files) };
}

export async function importClient(source: string): Promise<string> {
  const input = path.resolve(source);
  if (!fs.existsSync(input) || !fs.lstatSync(input).isDirectory())
    throw new Error(`Client source is not a directory: ${input}`);
  const snapshot = await snapshotClient(input);
  const destination = snapshotDirectory(snapshot.sha256);
  fs.mkdirSync(clientsRoot(), { recursive: true });
  return withLock(`${destination}.lock`, async () => {
    const client = path.join(destination, "game-client");
    if (fs.existsSync(destination)) {
      const existing = readSnapshotManifest(snapshot.sha256);
      const current = await snapshotClient(client);
      if (current.sha256 !== existing.id) throw new Error("Existing client snapshot is corrupt");
      return snapshot.sha256;
    }

    const staging = `${destination}.${process.pid}.staging`;
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    try {
      copyTree(input, path.join(staging, "game-client"));
      const copied = await snapshotClient(path.join(staging, "game-client"));
      if (copied.sha256 !== snapshot.sha256)
        throw new Error("Client bytes changed while importing");
      atomicJson(path.join(staging, "snapshot-manifest.json"), {
        schemaVersion: 1,
        id: snapshot.sha256,
        files: copied.files,
      } satisfies SnapshotManifest);
      fs.renameSync(staging, destination);
      try {
        makeSnapshotReadOnly(destination);
      } catch (error) {
        removeSnapshot(destination);
        throw error;
      }
      return snapshot.sha256;
    } catch (error) {
      removeSnapshot(staging);
      throw error;
    }
  });
}

export async function selectClient(snapshotId: string): Promise<void> {
  const directory = snapshotDirectory(snapshotId);
  const manifest = readSnapshotManifest(snapshotId);
  const root = path.join(directory, "game-client");
  const actual = await snapshotClient(root);
  if (actual.sha256 !== snapshotId || digest(manifest.files) !== actual.sha256)
    throw new Error("Client snapshot inventory changed");
  const selections = selectionsRoot();
  fs.mkdirSync(selections, { recursive: true });
  await withLock(path.join(selections, "client.lock"), async () => {
    atomicJson(path.join(selections, "client.json"), {
      schemaVersion: 1,
      snapshotId,
    } satisfies ClientSelection);
  });
}

export async function assertClientUnchanged(environment: Manifest): Promise<void> {
  const snapshotId = environment.clientSnapshotId ?? environment.inputs.sha256;
  const manifest = readSnapshotManifest(snapshotId);
  const root = clientRoot(snapshotId);
  const files = await inventory(root);
  if (
    digest(files) !== environment.inputs.sha256 ||
    digest(files) !== manifest.id ||
    digest(files) !== digest(manifest.files)
  )
    throw new Error("Client snapshot changed; import and select it again");
}
