import fs from "node:fs";
import path from "node:path";

// Remove a path only when it is strictly inside the expected parent and contains no links.
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
