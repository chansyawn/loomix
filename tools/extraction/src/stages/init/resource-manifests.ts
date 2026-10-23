import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { within } from "../../paths.ts";

interface ResourceEntry {
  path: string;
  md5: string;
  bytes: number;
}
export function parseResourceManifest(text: string): ResourceEntry[] {
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

export async function validateResourceManifests(
  gameRoot: string,
  manifestId: string,
): Promise<
  { manifest: string; checked: number; uninstalled: string[]; withoutChecksum: string[] }[]
> {
  const dataManifest = `Persistent/versions/${manifestId}/data_versions.json`;
  const dataPaths = new Set(
    parseResourceManifest(fs.readFileSync(within(gameRoot, dataManifest), "utf8")).map(
      (entry) => entry.path,
    ),
  );
  const reports: {
    manifest: string;
    checked: number;
    uninstalled: string[];
    withoutChecksum: string[];
  }[] = [];
  for (const [scope, manifest] of [
    ["StreamingAssets", "StreamingAssets/res_versions.json"],
    ["Persistent", `Persistent/versions/${manifestId}/res_versions.json`],
    ["Persistent", `Persistent/versions/${manifestId}/data_versions.json`],
  ]) {
    const entries = parseResourceManifest(fs.readFileSync(within(gameRoot, manifest), "utf8"));
    let checked = 0;
    const uninstalled: string[] = [];
    const withoutChecksum: string[] = [];
    for (const entry of entries) {
      // The data update supersedes matching resource-update entries, as in source-audit.
      if (
        scope === "Persistent" &&
        manifest.endsWith("/res_versions.json") &&
        dataPaths.has(entry.path)
      )
        continue;
      const file = within(path.join(gameRoot, scope), entry.path);
      // Update manifests include unchanged base packages and optional downloads.
      // Missing overlays are not evidence of absence; selected sources are audited in extract.
      if (!fs.existsSync(file)) {
        uninstalled.push(entry.path);
        continue;
      }
      const hash = crypto.createHash("md5");
      let bytes = 0;
      for await (const chunk of fs.createReadStream(file)) {
        hash.update(chunk);
        bytes += chunk.length;
      }
      const md5 = hash.digest("hex");
      if (bytes !== entry.bytes || (entry.md5 !== "0" && md5 !== entry.md5))
        throw new Error(
          `Resource manifest checksum mismatch: ${file}; expected MD5 ${entry.md5}, ${entry.bytes} bytes; actual MD5 ${md5}, ${bytes} bytes`,
        );
      if (entry.md5 === "0") withoutChecksum.push(entry.path);
      else checked++;
    }
    reports.push({ manifest, checked, uninstalled, withoutChecksum });
    console.log(
      `Manifest ${manifest}: ${entries.length} entries, ${checked} installed files verified`,
    );
  }
  return reports;
}
