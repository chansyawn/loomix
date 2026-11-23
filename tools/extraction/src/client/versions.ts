import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { within } from "../paths.ts";
import { errorCode } from "../workflow/errors.ts";

export interface VersionEntry {
  path: string;
  md5: string;
  bytes: number;
}

export interface ClientRevisions {
  data: { revision: number; branch: string };
  resource: { revision: number };
}

export interface ClientLayout {
  gameRoot: string;
  clientIni: string;
}

export interface ClientVersion {
  gameVersion: string;
  branch: string;
  dataRevision: number;
  resourceRevision: number;
  manifestId: string;
}

export const clientVersionPattern = String.raw`\d+(?:\.\d+)+`;
const gameVersionPattern = new RegExp(`^${clientVersionPattern}$`);
const revisionSchema = z.object({ revision: z.number().int().nonnegative() });
const dataRevisionSchema = revisionSchema.extend({ branch: z.string().trim().min(1) });

export interface ManifestMaps {
  base: Map<string, VersionEntry>;
  patch: Map<string, VersionEntry>;
  data: Map<string, VersionEntry>;
}

export function parseVersionManifest(text: string): VersionEntry[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.shift() !== "FilePath,md5,FileSize")
    throw new Error("Invalid resource manifest header");
  const seen = new Set<string>();
  return lines.map((line) => {
    const [file, md5, size, extra] = line.split(",");
    const bytes = Number(size);
    if (
      !file ||
      file.startsWith("/") ||
      file.includes("\\") ||
      file.split("/").includes("..") ||
      !(md5 === "0" || /^[a-f0-9]{32}$/.test(md5)) ||
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      extra !== undefined ||
      seen.has(file)
    )
      throw new Error(`Invalid resource manifest entry: ${line}`);
    seen.add(file);
    return { path: file, md5, bytes };
  });
}

export function readVersionManifest(file: string): VersionEntry[] {
  return parseVersionManifest(fs.readFileSync(file, "utf8"));
}

export function readClientVersion(clientIni: string): string {
  const version = fs
    .readFileSync(clientIni, "utf8")
    .match(/^game_version=(.*)$/m)?.[1]
    .trim();
  if (!version) throw new Error(`Missing game_version in ${clientIni}`);
  if (!gameVersionPattern.test(version)) throw new Error(`Invalid game_version in ${clientIni}`);
  return version;
}

function readOptionalMetadata(file: string): string | undefined {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
  }
}

export function readRevisions(versionsDirectory: string): ClientRevisions | undefined {
  const data = readOptionalMetadata(within(versionsDirectory, "data_revision.json"));
  const resource = readOptionalMetadata(within(versionsDirectory, "res_revision.json"));
  if (data === undefined && resource === undefined) return;
  if (data === undefined || resource === undefined)
    throw new Error(`Incomplete revisions in ${versionsDirectory}`);
  return {
    data: dataRevisionSchema.parse(JSON.parse(data)),
    resource: revisionSchema.parse(JSON.parse(resource)),
  };
}

export function clientVersionMatches(
  gameRoot: string,
  clientIni: string,
  expected: ClientVersion,
): boolean {
  if (readClientVersion(clientIni) !== expected.gameVersion) return false;
  const revisions = readRevisions(within(gameRoot, `Persistent/versions/${expected.manifestId}`));
  return (
    revisions?.data.revision === expected.dataRevision &&
    revisions.data.branch === expected.branch &&
    revisions.resource.revision === expected.resourceRevision
  );
}

export function clientVersionLabel(root: string, layout: ClientLayout): string {
  const version = readClientVersion(within(root, layout.clientIni));
  const gameRoot = within(root, layout.gameRoot);
  if (!fs.lstatSync(gameRoot).isDirectory()) throw new Error(`Invalid client layout: ${gameRoot}`);
  const versions = within(gameRoot, "Persistent/versions");
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(versions, { withFileTypes: true });
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
    return version;
  }
  const labels = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    const revisions = readRevisions(within(versions, entry.name));
    if (revisions)
      labels.push(
        `${version}-d${revisions.data.revision}-r${revisions.resource.revision}-m${entry.name}`,
      );
  }
  return labels.length === 1 ? labels[0] : version;
}

export function readManifestMaps(gameRoot: string, manifestId: string): ManifestMaps {
  const versions = path.join(gameRoot, "Persistent/versions", manifestId);
  return {
    base: new Map(
      readVersionManifest(within(gameRoot, "StreamingAssets/res_versions.json")).map((entry) => [
        entry.path,
        entry,
      ]),
    ),
    patch: new Map(
      readVersionManifest(
        within(gameRoot, `Persistent/versions/${manifestId}/res_versions.json`),
      ).map((entry) => [entry.path, entry]),
    ),
    data: new Map(
      readVersionManifest(path.join(versions, "data_versions.json")).map((entry) => [
        entry.path,
        entry,
      ]),
    ),
  };
}

export function manifestEntry(
  maps: ManifestMaps,
  scope: "StreamingAssets" | "Persistent",
  file: string,
): VersionEntry | undefined {
  if (scope === "Persistent") return maps.data.get(file) ?? maps.patch.get(file);
  return maps.base.get(file);
}
