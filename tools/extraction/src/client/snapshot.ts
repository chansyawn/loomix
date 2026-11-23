import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { assertIdentity, clientsRoot, within } from "../paths.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import type { FileHash } from "../workflow/hashing.ts";
import { atomicJson } from "../workflow/manifest.ts";
import { withLock } from "../workflow/lock.ts";
import { copyTree } from "../workflow/copy.ts";
import { errorCode, errorMessage } from "../workflow/errors.ts";
import { clientVersionLabel, clientVersionMatches, clientVersionLabelPattern } from "./versions.ts";
import type { ClientLayout, ClientVersion } from "./versions.ts";

export interface ClientSnapshot {
  readonly id: string;
  readonly directory: string;
  readonly files: readonly FileHash[];
  readonly resolvePath: (relative: string) => string;
  verify(): Promise<void>;
}

type SnapshotProfile = ClientVersion & { paths: ClientLayout };
const prefixLength = 12;
const directoryPattern = new RegExp(`^${clientVersionLabelPattern}--([a-f0-9]{${prefixLength}})$`);

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

function snapshotNames(): string[] {
  try {
    return fs
      .readdirSync(clientsRoot())
      .filter((name) => directoryPattern.test(name))
      .sort();
  } catch (error) {
    if (errorCode(error) === "ENOENT") return [];
    throw error;
  }
}

function contentRoot(directory: string): string {
  const root = within(directory, "game-client");
  if (!fs.lstatSync(root).isDirectory()) throw new Error(`Invalid client snapshot root: ${root}`);
  return root;
}

function readSnapshot(name: string): ClientSnapshot {
  const store = clientsRoot();
  const directory = within(store, name);
  const manifestFile = within(directory, "snapshot-manifest.json");
  const manifest = snapshotManifestSchema.parse(JSON.parse(fs.readFileSync(manifestFile, "utf8")));
  if (
    !name.endsWith(`--${manifest.id.slice(0, prefixLength)}`) ||
    digest(manifest.files) !== manifest.id
  )
    throw new Error(`Client snapshot manifest is invalid: ${manifestFile}`);
  contentRoot(directory);
  const root = () => within(store, `${name}/game-client`);
  return {
    id: manifest.id,
    directory,
    files: manifest.files,
    resolvePath: (relative) => within(root(), relative),
    async verify() {
      if (digest(await inventory(root())) !== manifest.id)
        throw new Error(`Client snapshot inventory changed: ${manifest.id} (${directory})`);
    },
  };
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
    }
  };
  makeWritable(root);
  fs.rmSync(root, { recursive: true, force: true });
}

function describe(snapshots: readonly ClientSnapshot[]): string {
  return snapshots.map(({ id, directory }) => `${id} ${directory}`).join("\n");
}

function findSnapshot(id: string): ClientSnapshot | undefined {
  const matches: ClientSnapshot[] = [];
  const diagnostics: string[] = [];
  const suffix = `--${id.slice(0, prefixLength)}`;
  for (const name of snapshotNames()) {
    if (!name.endsWith(suffix)) continue;
    try {
      const snapshot = readSnapshot(name);
      if (snapshot.id === id) matches.push(snapshot);
    } catch (error) {
      diagnostics.push(`${name}: ${errorMessage(error)}`);
    }
  }
  if (matches.length > 1) throw new Error(`Duplicate client snapshot ID:\n${describe(matches)}`);
  if (!matches.length && diagnostics.length)
    throw new Error(`Cannot open client snapshot ${id}:\n${diagnostics.join("\n")}`);
  return matches[0];
}

export function openClientSnapshot(id: string): ClientSnapshot {
  assertIdentity(id, "client snapshot");
  const snapshot = findSnapshot(id);
  if (!snapshot) throw new Error(`Missing client snapshot: ${id}`);
  return snapshot;
}

export function resolveClientSnapshot(
  profile: SnapshotProfile,
  id?: string,
): { snapshot: ClientSnapshot; diagnostics: string[] } {
  const expected = `${profile.gameVersion}, ${profile.branch}, data ${profile.dataRevision}, resources ${profile.resourceRevision}, manifest ${profile.manifestId}`;
  const matchesProfile = (resolvePath: ClientSnapshot["resolvePath"]) =>
    clientVersionMatches(
      resolvePath(profile.paths.gameRoot),
      resolvePath(profile.paths.clientIni),
      profile,
    );
  if (id !== undefined) {
    const snapshot = openClientSnapshot(id);
    if (!matchesProfile(snapshot.resolvePath))
      throw new Error(`Client snapshot ${id} does not match the verified profile (${expected})`);
    return { snapshot, diagnostics: [] };
  }

  const matches: ClientSnapshot[] = [];
  const diagnostics: string[] = [];
  for (const name of snapshotNames()) {
    try {
      const root = contentRoot(within(clientsRoot(), name));
      if (matchesProfile((relative) => within(root, relative))) matches.push(readSnapshot(name));
    } catch (error) {
      diagnostics.push(`${name}: ${errorMessage(error)}`);
    }
  }
  if (matches.length === 1) return { snapshot: matches[0], diagnostics };
  const details = diagnostics.length ? `\n${diagnostics.join("\n")}` : "";
  if (matches.length === 0) {
    throw new Error(
      `No client snapshot matches the verified profile (${expected}). Run client import --source PATH.${details}`,
    );
  }
  if (new Set(matches.map((snapshot) => snapshot.id)).size !== matches.length)
    throw new Error(`Duplicate client snapshot ID:\n${describe(matches)}${details}`);
  throw new Error(
    `Multiple matching client snapshots; use --snapshot ID:\n${describe(matches)}${details}`,
  );
}

export async function importClient(source: string, layout: ClientLayout): Promise<ClientSnapshot> {
  if (fs.lstatSync(source).isSymbolicLink()) throw new Error(`Refusing symbolic link: ${source}`);
  const input = fs.realpathSync(source);
  clientVersionLabel(input, layout);
  const store = within(path.dirname(clientsRoot()), "clients");
  fs.mkdirSync(path.dirname(store), { recursive: true });
  const shared = path.join(fs.realpathSync(path.dirname(store)), path.basename(store));
  const relative = path.relative(input, shared);
  if (
    relative === "" ||
    (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
  )
    throw new Error(`Client source contains the snapshot store: ${input}`);
  fs.mkdirSync(store, { recursive: true });
  const id = digest(await inventory(input));
  const prefix = id.slice(0, prefixLength);
  return withLock(within(clientsRoot(), `${prefix}.lock`), async () => {
    const existing = findSnapshot(id);
    if (existing) {
      await existing.verify();
      return existing;
    }

    const staging = fs.mkdtempSync(within(clientsRoot(), ".import-"));
    try {
      const root = path.join(staging, "game-client");
      copyTree(input, root);
      const files = await inventory(root);
      if (digest(files) !== id) throw new Error("Client bytes changed while importing");
      const name = `${clientVersionLabel(root, layout)}--${prefix}`;
      const destination = within(clientsRoot(), name);
      if (fs.existsSync(destination))
        throw new Error(
          `Client snapshot directory collision: ${destination} (${readSnapshot(name).id}, ${id})`,
        );
      atomicJson(path.join(staging, "snapshot-manifest.json"), {
        schemaVersion: 1,
        id,
        files,
      });
      makeSnapshotReadOnly(staging);
      fs.renameSync(staging, destination);
      return readSnapshot(name);
    } catch (error) {
      removeSnapshot(staging);
      throw error;
    }
  });
}
