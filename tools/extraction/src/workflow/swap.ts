import fs from "node:fs";

// 使用已完整校验的暂存目录树替换目标目录，失败时恢复原目录树。
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
