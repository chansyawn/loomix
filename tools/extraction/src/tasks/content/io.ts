import fs from "node:fs";
import path from "node:path";

export { readJson, writeJson } from "../../workflow/json.ts";

export function removeWithin(file: string, parent: string) {
  const absolute = path.resolve(file),
    root = path.resolve(parent);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`Unsafe cleanup path: ${absolute}`);
  // 递归清理时禁止跟随目录联接或符号链接。
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
