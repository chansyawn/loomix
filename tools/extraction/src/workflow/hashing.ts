import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface FileHash {
  path: string;
  sha256: string;
  bytes: number;
}

export function digest(value: object | string): string {
  return crypto
    .createHash("sha256")
    .update(
      value instanceof Uint8Array
        ? value
        : typeof value === "string"
          ? value
          : JSON.stringify(value),
    )
    .digest("hex");
}

export async function hashFile(file: string): Promise<Omit<FileHash, "path">> {
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { sha256: hash.digest("hex"), bytes };
}

export function filesWithin(root: string): string[] {
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error(`Refusing symbolic link: ${root}`);
  const result: string[] = [];
  function visit(directory: string) {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${file}`);
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile()) result.push(path.relative(root, file).split(path.sep).join("/"));
      else throw new Error(`Not a regular file: ${file}`);
    }
  }
  visit(root);
  return result;
}

export async function inventory(root: string, files = filesWithin(root)): Promise<FileHash[]> {
  const result: FileHash[] = [];
  for (const file of [...files].sort())
    result.push({ path: file, ...(await hashFile(path.join(root, file))) });
  return result;
}
