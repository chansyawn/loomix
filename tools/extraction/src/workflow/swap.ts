import fs from "node:fs";

// Replace a directory with a fully verified staging tree, restoring the previous tree on failure.
export function swapDirectory(staging: string, target: string): void {
  const previous = `${target}.previous`;
  fs.rmSync(previous, { recursive: true, force: true });
  if (fs.existsSync(target)) fs.renameSync(target, previous);
  try {
    fs.renameSync(staging, target);
  } catch (error) {
    if (fs.existsSync(previous)) fs.renameSync(previous, target);
    throw error;
  }
  fs.rmSync(previous, { recursive: true, force: true });
}
