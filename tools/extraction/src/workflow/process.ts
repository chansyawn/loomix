import fs from "node:fs";
import path from "node:path";
import { execa, ExecaError } from "execa";
import { repoRoot } from "../paths.ts";

export interface ProcessOptions {
  logFile?: string;
  logMode?: "append" | "truncate";
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export async function runProcess(
  executable: string,
  args: string[],
  { logFile, logMode = "append", cwd = repoRoot, env }: ProcessOptions = {},
): Promise<void> {
  if (logFile) fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const output = logFile ? { file: logFile, append: logMode === "append" } : "inherit";
  try {
    await execa(executable, args, {
      cwd,
      env,
      windowsHide: true,
      stdin: "ignore",
      stdout: output,
      stderr: output,
      buffer: false,
    });
  } catch (cause) {
    if (logFile) fs.appendFileSync(logFile, `${String(cause)}\n`);
    const message =
      cause instanceof ExecaError && (cause.exitCode !== undefined || cause.signal)
        ? `Process failed (${cause.exitCode ?? cause.signal})`
        : "Unable to start";
    throw new Error(`${message}: ${executable}${logFile ? `; see ${logFile}` : ""}`, { cause });
  }
}
