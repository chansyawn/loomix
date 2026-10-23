import { errorCode } from "./errors.ts";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { setTimeout } from "node:timers/promises";

async function removeAbandonedLock(directory: string) {
  const owner = path.join(directory, "owner.json");
  try {
    const data: unknown = JSON.parse(await fs.readFile(owner, "utf8"));
    if (
      typeof data !== "object" ||
      data === null ||
      !("pid" in data) ||
      typeof data.pid !== "number" ||
      !Number.isSafeInteger(data.pid) ||
      data.pid <= 0
    )
      return;
    const pid = data.pid;
    try {
      process.kill(pid, 0);
      return;
    } catch (error) {
      if (errorCode(error) !== "ESRCH") return;
    }
    // 仅有一个等待者能移走 owner；之后只删除空锁目录，避免误删新锁。
    const abandoned = `${directory}.${crypto.randomUUID()}.abandoned`;
    await fs.rename(owner, abandoned);
    try {
      await fs.rmdir(directory);
    } finally {
      await fs.rm(abandoned, { force: true });
    }
  } catch (error) {
    if (error instanceof SyntaxError) return;
    if (errorCode(error) === "ENOENT") {
      try {
        const stat = await fs.stat(directory);
        if (Date.now() - stat.mtimeMs > 30_000) await fs.rmdir(directory);
      } catch (missing) {
        if (!["ENOENT", "ENOTEMPTY"].includes(errorCode(missing) ?? "")) throw missing;
      }
    } else if (errorCode(error) !== "ENOTEMPTY") throw error;
  }
}

export async function withLock<T>(
  directory: string,
  action: () => T | Promise<T>,
  { timeout = 20 * 60_000, interval = 250 } = {},
): Promise<T> {
  await fs.mkdir(path.dirname(directory), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      await fs.mkdir(directory);
      break;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      await removeAbandonedLock(directory);
      if (Date.now() - started >= timeout)
        throw new Error(`Timed out waiting for lock; check ${directory}`);
      await setTimeout(interval);
    }
  }
  try {
    await fs.writeFile(path.join(directory, "owner.json"), JSON.stringify({ pid: process.pid }));
    return await action();
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
