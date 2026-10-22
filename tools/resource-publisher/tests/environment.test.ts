import { mkdtemp, mkdir, copyFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, expect, test } from "vite-plus/test";
import { loadEnvironment } from "../src/environment.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("loads the publisher's .env independently of cwd and preserves existing variables", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loomix-env-"));
  directories.push(root);
  await mkdir(path.join(root, "publisher/src"), { recursive: true });
  await mkdir(path.join(root, "elsewhere"));
  const module = path.join(root, "publisher/src/environment.mts");
  await copyFile(new URL("../src/environment.ts", import.meta.url), module);
  await writeFile(
    path.join(root, "publisher/.env"),
    'LOOMIX_ENV_FIXTURE="from file"\nLOOMIX_ENV_OVERRIDE=file\n',
  );
  await writeFile(path.join(root, "elsewhere/.env"), "LOOMIX_ENV_FIXTURE=wrong\n");
  const script = `import { loadEnvironment } from ${JSON.stringify(pathToFileURL(module).href)}; loadEnvironment(); console.log(JSON.stringify([process.env.LOOMIX_ENV_FIXTURE, process.env.LOOMIX_ENV_OVERRIDE]));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: path.join(root, "elsewhere"),
    env: { ...process.env, LOOMIX_ENV_OVERRIDE: "existing" },
    encoding: "utf8",
  });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(["from file", "existing"]);
});

test("missing .env is optional but other file errors are reported", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loomix-env-errors-"));
  directories.push(root);
  expect(() => loadEnvironment(path.join(root, "missing"))).not.toThrow();
  expect(() => loadEnvironment(root)).toThrow();
});
