import { errorCode } from "../../workflow/errors.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "./config.ts";

function contains(parent: string, child: string) {
  const relative = path.relative(parent.toLowerCase(), child.toLowerCase());
  return (
    !relative ||
    (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative))
  );
}

function assertSafeDestination(output: string) {
  const protectedPaths = [
    "apps",
    "packages",
    "tools",
    ".git",
    ".agents",
    ".codex",
    "resources/game-client",
    "resources/extraction-tools",
    "resources/temp/extraction",
  ].map((relative) => path.resolve(repoRoot, relative));
  if (
    protectedPaths.some(
      (protectedPath) => contains(protectedPath, output) || contains(output, protectedPath),
    )
  )
    throw new Error(`Unsafe output directory: ${output}`);
  for (let current = output; ; current = path.dirname(current)) {
    try {
      if (fs.lstatSync(current).isSymbolicLink())
        throw new Error("Output path cannot contain a link");
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
    }
    // 系统临时目录在 macOS 上位于 /var 别名之下；只检查其内部的用户路径。
    if (
      current === repoRoot ||
      current === path.resolve(os.tmpdir()) ||
      path.dirname(current) === current
    )
      break;
  }
}

export function safeOutput(output: string) {
  output = path.resolve(output);
  assertSafeDestination(output);
  if (fs.existsSync(output)) {
    if (fs.lstatSync(output).isSymbolicLink()) throw new Error("Output cannot be a link");
    const placeholder = path.join(output, ".gitkeep");
    if (fs.existsSync(placeholder) && !fs.lstatSync(placeholder).isFile())
      throw new Error("Output placeholder must be a regular file");
    const json = path.join(output, "content.json");
    if (
      fs.existsSync(json) &&
      (!fs.lstatSync(json).isFile() || fs.lstatSync(json).isSymbolicLink())
    )
      throw new Error("Output JSON must be a regular file");
    if (fs.existsSync(path.join(output, "assets"))) {
      const assets = path.join(output, "assets");
      if (!fs.lstatSync(assets).isDirectory() || fs.lstatSync(assets).isSymbolicLink())
        throw new Error("Output assets must be a regular directory");
      for (const name of fs.readdirSync(assets)) {
        const stat = fs.lstatSync(path.join(assets, name));
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error("Output assets contain a link or subdirectory");
      }
    }
    const unexpected = fs
      .readdirSync(output)
      .filter((s) => !["content.json", "assets", ".gitkeep"].includes(s));
    if (unexpected.length)
      throw new Error(`Output contains unrelated files: ${unexpected.join(", ")}`);
  }
}
