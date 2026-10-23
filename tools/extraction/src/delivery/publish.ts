import type { ContentOptions, ValidationReport } from "../extraction/types.ts";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readJson } from "../workflow/json.ts";
import { removeWithin } from "../workflow/fs.ts";
import { filesWithin, inventory, digest } from "../workflow/hashing.ts";
import { safeOutput } from "./output.ts";

export { safeOutput };

export async function publish(
  options: ContentOptions,
  validateStaging?: (options: ContentOptions) => Promise<void>,
  rename = fs.renameSync,
) {
  safeOutput(options.output);
  const staging = path.join(options.work, "staging");
  const result = readJson<ValidationReport>(path.join(options.work, "validation.json"));
  if (!result.passed) throw new Error("Validation has not passed");
  if (validateStaging) await validateStaging(options);
  // Validate the complete tree before copying; cp must never follow a resource symlink.
  const expected = await inventory(staging, filesWithin(staging));
  const parent = path.dirname(options.output);
  fs.mkdirSync(parent, { recursive: true });
  const token = crypto.randomUUID();
  const next = path.join(parent, `.delivery-${token}.next`);
  const previous = path.join(parent, `.delivery-${token}.previous`);
  let moved = false;
  try {
    fs.cpSync(staging, next, { recursive: true });
    if (fs.existsSync(path.join(options.output, ".gitkeep")))
      fs.copyFileSync(path.join(options.output, ".gitkeep"), path.join(next, ".gitkeep"));
    safeOutput(next);
    if (
      digest(
        await inventory(
          next,
          filesWithin(next).filter((file) => file !== ".gitkeep"),
        ),
      ) !== digest(expected)
    )
      throw new Error("Delivery bytes changed during publication");
    safeOutput(options.output);
    if (fs.existsSync(options.output)) {
      rename(options.output, previous);
      moved = true;
    }
    try {
      rename(next, options.output);
    } catch (error) {
      if (moved) fs.renameSync(previous, options.output);
      throw error;
    }
  } finally {
    removeWithin(next, parent);
    if (fs.existsSync(options.output)) removeWithin(previous, parent);
  }
}
