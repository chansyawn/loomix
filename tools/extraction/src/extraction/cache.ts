import fs from "node:fs";
import path from "node:path";
import { withLock } from "../workflow/lock.ts";
import { atomicJson, verifyFiles } from "../workflow/manifest.ts";
import { digest, filesWithin, inventory } from "../workflow/hashing.ts";
import { readJson } from "../workflow/json.ts";
import { copyTree } from "../workflow/copy.ts";
import { z } from "zod";

const receiptSchema = z.strictObject({
  key: z.string().regex(/^[a-f0-9]{64}$/),
  files: z
    .strictObject({
      path: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number().int().nonnegative(),
    })
    .array(),
});

export async function cachedDirectory(
  root: string,
  input: object,
  build: (staging: string) => Promise<void>,
): Promise<string> {
  const key = digest(input);
  const directory = path.join(root, key);
  fs.mkdirSync(root, { recursive: true });
  return withLock(`${directory}.lock`, async () => {
    try {
      const receipt = receiptSchema.parse(readJson(path.join(directory, "receipt.json")));
      if (receipt.key !== key) throw new Error("Cache identity mismatch");
      await verifyFiles(directory, receipt.files);
      if (
        digest(filesWithin(directory).filter((file) => file !== "receipt.json")) !==
        digest(receipt.files.map((file) => file.path))
      )
        throw new Error("Cache file set changed");
      return directory;
    } catch {
      fs.rmSync(directory, { recursive: true, force: true });
    }
    const staging = fs.mkdtempSync(path.join(root, `${key}.staging-`));
    try {
      await build(staging);
      atomicJson(path.join(staging, "receipt.json"), { key, files: await inventory(staging) });
      fs.renameSync(staging, directory);
      return directory;
    } catch (error) {
      const failures = path.join(root, "failures");
      fs.mkdirSync(failures, { recursive: true });
      fs.renameSync(staging, path.join(failures, path.basename(staging)));
      throw error;
    }
  });
}

export function copyCachedDirectory(cache: string, destination: string): void {
  fs.mkdirSync(destination, { recursive: true });
  for (const name of fs.readdirSync(cache)) {
    if (name === "receipt.json") continue;
    const source = path.join(cache, name);
    const target = path.join(destination, name);
    if (fs.lstatSync(source).isDirectory()) copyTree(source, target);
    else fs.copyFileSync(source, target);
  }
}
