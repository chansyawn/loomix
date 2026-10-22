import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { profile } from "../tasks/content/config.ts";
import { version, patchFile, runtimeIdentifier } from "./anime-studio/config.ts";
import { digest, inventory, filesWithin } from "./hashing.ts";
import { repoRoot } from "./client-profile.ts";

export const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
export const profileHash = digest({ ...profile, paths: { ...profile.paths, assetMap: null } });
export const toolIdentity = () => ({
  ...version,
  rid: runtimeIdentifier(process.platform, process.arch),
  patch: digest(fs.readFileSync(patchFile).toString()),
});
export async function implementationRevision(): Promise<string> {
  const sources = await inventory(
    sourceRoot,
    filesWithin(sourceRoot).filter(
      (file) =>
        !file.endsWith(".test.ts") && !file.includes("/docs/") && !file.includes("/fixtures/"),
    ),
  );
  const contracts = await inventory(repoRoot, [
    "pnpm-lock.yaml",
    "tools/extraction/package.json",
    "packages/content-schema/package.json",
    ...filesWithin(path.join(repoRoot, "packages/content-schema/src"))
      .filter((file) => !file.startsWith("node_modules/") && !file.endsWith(".test.ts"))
      .map((file) => `packages/content-schema/src/${file}`),
  ]);
  return digest({
    sources,
    contracts,
    runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  });
}
export function gitRevision(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}
