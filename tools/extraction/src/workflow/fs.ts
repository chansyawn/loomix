import fs from "node:fs";
import path from "node:path";

// 仅当路径严格位于预期父目录内部且不含符号链接时，才允许删除。
export function removeWithin(file: string, parent: string): void {
  const absolute = path.resolve(file),
    root = path.resolve(parent);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`Unsafe cleanup path: ${absolute}`);
  function check(current: string) {
    if (!fs.existsSync(current)) return;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Refusing cleanup of link: ${current}`);
    if (stat.isDirectory())
      for (const name of fs.readdirSync(current)) check(path.join(current, name));
  }
  check(absolute);
  fs.rmSync(absolute, { recursive: true, force: true });
}
