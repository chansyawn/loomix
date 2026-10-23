import type { ConfigFile } from "../types.ts";
import { readJson } from "../io.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getPaths, profile } from "./config.ts";
import { readClientVersion, readVersionManifest } from "../../../client/versions.ts";
import type { VersionEntry } from "../../../client/versions.ts";

const { out, gameRoot: root, clientIni } = getPaths();
fs.mkdirSync(out, { recursive: true });
const version = readClientVersion(clientIni);
if (version !== profile.gameVersion)
  throw new Error(
    `Client ${version} is not the verified ${profile.gameVersion}; update the profile and re-identify fields`,
  );
const versions = path.join(root, "Persistent/versions", profile.manifestId);
const revision = readJson<{ revision: number; branch: string }>(
  path.join(versions, "data_revision.json"),
);
const resourceRevision = readJson<{ revision: number }>(path.join(versions, "res_revision.json"));
if (
  revision.revision !== profile.dataRevision ||
  revision.branch !== profile.branch ||
  resourceRevision.revision !== profile.resourceRevision
) {
  throw new Error("Manifest revisions do not match the verified profile");
}
const manifest = readVersionManifest(path.join(versions, "data_versions.json"));
function inspect(file: string, expected: VersionEntry | undefined): ConfigFile {
  if (!expected) throw new Error(`No manifest entry for ${file}`);
  if (!fs.existsSync(file)) return { file, exists: false };
  const bytes = fs.readFileSync(file),
    md5 = crypto.createHash("md5").update(bytes).digest("hex");
  return {
    file,
    exists: true,
    size: bytes.length,
    md5,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    matchesManifest: bytes.length === expected.bytes && md5 === expected.md5,
  };
}
const checks = [
  "StreamingAssets/GenerateAssets",
  "Persistent/GenerateAssets",
  `Persistent/Temp/${profile.manifestId}/GenerateAssets`,
].map((relativeDirectory) => ({
  relativeDirectory,
  files: ["cs.obb", "ed.obb"].map((name) =>
    inspect(
      path.join(root, relativeDirectory, name),
      manifest.find((x) => x.path === `GenerateAssets/${name}`),
    ),
  ),
}));
const selected = checks.find((x) => x.files.every((f) => f.matchesManifest));
if (!selected) throw new Error("No complete config pair matches the selected local data manifest");
const source = {
  ...selected,
  dataRevision: revision.revision,
  branch: revision.branch,
  revisionMetadata: revision,
  verifiedAgainst: `Persistent/versions/${profile.manifestId}/data_versions.json`,
};
const dataBundle = inspect(
  path.join(root, "Persistent/AssetBundle/blocks/00/00000002.blk"),
  manifest.find((x) => x.path === "AssetBundle/blocks/00/00000002.blk"),
);
if (!dataBundle.matchesManifest) throw new Error("Data bundle does not match data manifest");
fs.writeFileSync(`${out}/active-config-source.json`, JSON.stringify(source, null, 2));
fs.writeFileSync(
  `${out}/version-audit.json`,
  JSON.stringify({ source, checks, dataBundle, resourceRevision }, null, 2),
);
console.log(JSON.stringify(source, null, 2));
