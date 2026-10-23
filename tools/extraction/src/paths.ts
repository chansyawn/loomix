import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

export const varRoot = path.join(repoRoot, "var");
export const artifactsRoot = path.join(varRoot, "artifacts");
export const scratchRoot = path.join(varRoot, "scratch");
export const websiteDirectory = path.join(repoRoot, "resources/website");

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
  return within(artifactsRoot, `${kind}/${id}`);
}
