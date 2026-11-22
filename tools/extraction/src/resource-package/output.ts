import { errorCode } from "../workflow/errors.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ContextSchema } from "@loomix/schema/common";
import {
  documentPath,
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceDocumentTypeSchema,
} from "@loomix/schema/website-resources";
import { repoRoot } from "../paths.ts";

const resourceLocales = ContextSchema.shape.locale.options;
const resourceDirectories = new Set<string>(["assets", ...resourceLocales]);
const resourceDocuments = new Set([
  ".gitkeep",
  WEBSITE_RESOURCE_MANIFEST_FILE,
  ...resourceLocales.flatMap((locale) =>
    WebsiteResourceDocumentTypeSchema.options.map((kind) => documentPath(kind, locale)),
  ),
]);

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
    "var",
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
    const names = fs.readdirSync(output);
    const placeholder = path.join(output, ".gitkeep");
    if (
      names.includes(".gitkeep") &&
      (!fs.lstatSync(placeholder).isFile() || fs.lstatSync(placeholder).isSymbolicLink())
    )
      throw new Error("Output placeholder must be a regular file");
    const visit = (directory: string, prefix = "") => {
      for (const name of fs.readdirSync(directory)) {
        const key = prefix ? `${prefix}/${name}` : name;
        const file = path.join(directory, name);
        const stat = fs.lstatSync(file);
        if (stat.isSymbolicLink()) throw new Error("Output cannot contain a link");
        if (stat.isDirectory() && resourceDirectories.has(key)) visit(file, key);
        else if (
          !stat.isFile() ||
          (!resourceDocuments.has(key) && !/^assets\/[a-f0-9]{64}\.webp$/.test(key))
        )
          throw new Error(`Output contains unrelated file: ${key}`);
      }
    };
    visit(output);
  }
}
