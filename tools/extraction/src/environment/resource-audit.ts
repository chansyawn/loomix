import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { within } from "../paths.ts";
import { parseVersionManifest } from "../client/versions.ts";
import type { VersionEntry } from "../client/versions.ts";

export { parseVersionManifest as parseResourceManifest };

interface ManifestReport {
  manifest: string;
  checked: number;
  uninstalled: string[];
  withoutChecksum: string[];
}

export async function validateResourceManifests(
  gameRoot: string,
  manifestId: string,
): Promise<ManifestReport[]> {
  const dataManifest = `Persistent/versions/${manifestId}/data_versions.json`;
  const dataPaths = new Set(
    parseVersionManifest(fs.readFileSync(within(gameRoot, dataManifest), "utf8")).map(
      (entry) => entry.path,
    ),
  );
  const reports: ManifestReport[] = [];
  for (const [scope, manifest] of [
    ["StreamingAssets", "StreamingAssets/res_versions.json"],
    ["Persistent", `Persistent/versions/${manifestId}/res_versions.json`],
    ["Persistent", `Persistent/versions/${manifestId}/data_versions.json`],
  ] as const) {
    const entries: VersionEntry[] = parseVersionManifest(
      fs.readFileSync(within(gameRoot, manifest), "utf8"),
    );
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
