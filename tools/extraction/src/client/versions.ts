import fs from "node:fs";
import path from "node:path";
import { within } from "../paths.ts";

export interface VersionEntry {
  path: string;
  md5: string;
  bytes: number;
}

export interface ClientRevisions {
  data: { revision: number; branch: string };
  resource: { revision: number };
}

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
  return version;
}

export function readRevisions(versionsDirectory: string): ClientRevisions {
  return {
    data: JSON.parse(
      fs.readFileSync(path.join(versionsDirectory, "data_revision.json"), "utf8"),
    ) as ClientRevisions["data"],
    resource: JSON.parse(
      fs.readFileSync(path.join(versionsDirectory, "res_revision.json"), "utf8"),
    ) as ClientRevisions["resource"],
  };
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
