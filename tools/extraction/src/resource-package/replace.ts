import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { copyTree } from "../workflow/copy.ts";
import { filesWithin, inventory } from "../workflow/hashing.ts";
import type { FileHash } from "../workflow/hashing.ts";
import { removeWithin } from "../workflow/fs.ts";
import { safeOutput } from "./output.ts";

export async function replaceLocalResources(
  source: string,
  output: string,
  expected: readonly FileHash[],
  rename = fs.renameSync,
): Promise<void> {
  safeOutput(output);
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const token = crypto.randomUUID();
  const next = path.join(parent, `.website-resources-${token}.next`);
  const previous = path.join(parent, `.website-resources-${token}.previous`);
  let moved = false;
  try {
    copyTree(source, next);
    const placeholder = path.join(output, ".gitkeep");
    if (fs.existsSync(placeholder)) fs.copyFileSync(placeholder, path.join(next, ".gitkeep"));
    safeOutput(next);
    assert.deepEqual(
      await inventory(
        next,
        filesWithin(next).filter((file) => file !== ".gitkeep"),
      ),
      expected,
      "Website resource bytes changed during installation",
    );
    safeOutput(output);
    if (fs.existsSync(output)) {
      rename(output, previous);
      moved = true;
    }
    try {
      rename(next, output);
    } catch (error) {
      if (moved) fs.renameSync(previous, output);
      throw error;
    }
    if (moved) removeWithin(previous, parent);
  } finally {
    removeWithin(next, parent);
  }
}
