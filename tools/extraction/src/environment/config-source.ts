import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { profile } from "../profile.ts";
import { readClientVersion, readRevisions, readVersionManifest } from "../client/versions.ts";
import type { VersionEntry } from "../client/versions.ts";

export interface ConfigSourceFile {
  path: string;
  exists: boolean;
  md5?: string;
  sha256?: string;
  bytes?: number;
  matchesManifest: boolean;
}

export interface ConfigSource {
  schemaVersion: 1;
  dataRevision: number;
  branch: string;
  relativeDirectory: string;
  files: ConfigSourceFile[];
  dataBundle: ConfigSourceFile;
  candidates: { relativeDirectory: string; files: ConfigSourceFile[] }[];
}

function inspect(
  gameRoot: string,
  relative: string,
  expected: VersionEntry | undefined,
): ConfigSourceFile {
  if (!expected) throw new Error(`No manifest entry for ${relative}`);
  const file = path.join(gameRoot, relative);
  if (!fs.existsSync(file)) return { path: relative, exists: false, matchesManifest: false };
  const bytes = fs.readFileSync(file);
  const md5 = crypto.createHash("md5").update(bytes).digest("hex");
  return {
    path: relative,
    exists: true,
    bytes: bytes.length,
    md5,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    matchesManifest: bytes.length === expected.bytes && md5 === expected.md5,
  };
}

export function selectConfigSource(gameRoot: string, clientIni: string): ConfigSource {
  const version = readClientVersion(clientIni);
  if (version !== profile.gameVersion)
    throw new Error(
      `Client ${version} is not the verified ${profile.gameVersion}; update the profile and re-identify fields`,
    );
  const versions = path.join(gameRoot, "Persistent/versions", profile.manifestId);
  const revisions = readRevisions(versions);
  if (
    revisions.data.revision !== profile.dataRevision ||
    revisions.data.branch !== profile.branch ||
    revisions.resource.revision !== profile.resourceRevision
  )
    throw new Error("Manifest revisions do not match the verified profile");
  const manifest = readVersionManifest(path.join(versions, "data_versions.json"));
  const expected = (relative: string) => manifest.find((entry) => entry.path === relative);

  const candidates = [
    "StreamingAssets/GenerateAssets",
    "Persistent/GenerateAssets",
    `Persistent/Temp/${profile.manifestId}/GenerateAssets`,
  ].map((directory) => ({
    relativeDirectory: directory,
    files: ["cs.obb", "ed.obb"].map((name) =>
      inspect(gameRoot, `${directory}/${name}`, expected(`GenerateAssets/${name}`)),
    ),
  }));
  const selected = candidates.find((candidate) =>
    candidate.files.every((file) => file.matchesManifest),
  );
  if (!selected)
    throw new Error("No complete config pair matches the selected local data manifest");
  const dataBundle = inspect(
    gameRoot,
    "Persistent/AssetBundle/blocks/00/00000002.blk",
    expected("AssetBundle/blocks/00/00000002.blk"),
  );
  if (!dataBundle.matchesManifest) throw new Error("Data bundle does not match data manifest");

  return {
    schemaVersion: 1,
    dataRevision: revisions.data.revision,
    branch: revisions.data.branch,
    relativeDirectory: selected.relativeDirectory,
    files: selected.files,
    dataBundle,
    candidates,
  };
}
