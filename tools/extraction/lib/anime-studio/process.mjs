import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { repoRoot } from "./config.mjs";

export async function runProcess(executable, args, { logFile, cwd = repoRoot, env = {} } = {}) {
  let fd;
  if (logFile) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fd = fs.openSync(logFile, "a");
  }
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        cwd,
        env: { ...process.env, ...env },
        windowsHide: true,
        stdio: ["ignore", fd ?? "inherit", fd ?? "inherit"],
      });
      child.once("error", (cause) => {
        if (fd !== undefined) fs.writeSync(fd, `${cause.message}\n`);
        reject(
          new Error(`Unable to start ${executable}${logFile ? `; see ${logFile}` : ""}`, { cause }),
        );
      });
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `Process failed (${code ?? signal}): ${executable}${logFile ? `; see ${logFile}` : ""}`,
            ),
          );
      });
    });
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
