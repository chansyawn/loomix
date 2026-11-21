import { lstat, readFile } from "node:fs/promises";

export async function readRegularFile(file: string): Promise<Buffer> {
  if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular file: ${file}`);
  return readFile(file);
}
