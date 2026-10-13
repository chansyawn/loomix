import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export async function runProcess(executable, args, logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const fd = fs.openSync(logFile, "w");
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", fd, fd] });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
        else reject(new Error(`Process failed (${code ?? signal}); see ${logFile}`));
      });
    });
  } finally {
    fs.closeSync(fd);
  }
}

export function removeWithin(file, parent) {
  const absolute = path.resolve(file),
    root = path.resolve(parent);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`Unsafe cleanup path: ${absolute}`);
  // Never follow a junction or symlink during recursive cleanup.
  function check(current) {
    if (!fs.existsSync(current)) return;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Refusing cleanup of link: ${current}`);
    if (stat.isDirectory())
      for (const name of fs.readdirSync(current)) check(path.join(current, name));
  }
  check(absolute);
  fs.rmSync(absolute, { recursive: true, force: true });
}
