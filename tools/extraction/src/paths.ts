import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

export const varRoot = path.join(repoRoot, "var");
export const scratchRoot = path.join(varRoot, "scratch");
export const websiteDirectory = path.join(repoRoot, "resources/website");

if (process.env.NODE_ENV !== "test") {
  const localEnvironment = path.join(repoRoot, ".env");
  if (fs.existsSync(localEnvironment)) process.loadEnvFile(localEnvironment);
}

export function dataRoot(): string {
  const configured = process.env.LOOMIX_DATA_ROOT;
  if (!configured && process.env.NODE_ENV === "test")
    return path.join(os.tmpdir(), `loomix-test-data-${process.pid}`);
  if (!configured) throw new Error("Set LOOMIX_DATA_ROOT to the shared Loomix data directory");
  if (!path.isAbsolute(configured)) throw new Error("LOOMIX_DATA_ROOT must be an absolute path");
  return path.resolve(configured);
}

export function artifactsRoot(): string {
  return path.join(dataRoot(), "artifacts");
}

export function cacheRoot(): string {
  return path.join(dataRoot(), "cache");
}

export function clientsRoot(): string {
  return path.join(dataRoot(), "clients");
}

export function selectionsRoot(): string {
  return path.join(dataRoot(), "selections");
}

export function within(root: string, relative: string): string {
  if (path.isAbsolute(relative) || relative.includes("\\"))
    throw new Error(`Unsafe relative path: ${relative}`);
  const file = path.resolve(root, relative);
  const rel = path.relative(root, file);
  if (!rel || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel))
    throw new Error(`Unsafe relative path: ${relative}`);
  for (let current = file; ; current = path.dirname(current)) {
    try {
      if (fs.lstatSync(current).isSymbolicLink())
        throw new Error(`Refusing symbolic link: ${current}`);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (current === path.resolve(root)) break;
  }
  return file;
}

export function identityDirectory(
  kind: "environments" | "extractions" | "deliveries",
  id: string,
): string {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error(`Invalid ${kind} identity: ${id}`);
  return within(artifactsRoot(), `${kind}/${id}`);
}
