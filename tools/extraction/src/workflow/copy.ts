import fs from "node:fs";
import path from "node:path";

export function copyTree(source: string, destination: string): void {
  const info = fs.lstatSync(source);
  if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${source}`);
  if (!info.isDirectory()) throw new Error(`Copy source is not a directory: ${source}`);
  fs.mkdirSync(destination, { recursive: true, mode: (info.mode & 0o777) | 0o200 });
  for (const name of fs.readdirSync(source)) {
    const input = path.join(source, name);
    const output = path.join(destination, name);
    const child = fs.lstatSync(input);
    if (child.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${input}`);
    if (child.isDirectory()) copyTree(input, output);
    else if (child.isFile()) {
      fs.copyFileSync(input, output, fs.constants.COPYFILE_FICLONE);
      fs.chmodSync(output, child.mode & 0o777);
    } else throw new Error(`Not a regular file: ${input}`);
  }
  fs.chmodSync(destination, info.mode & 0o777);
}
