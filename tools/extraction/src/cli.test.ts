import { test } from "vite-plus/test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./cli.ts", import.meta.url));
test("CLI help works outside the repository without initializing client or tool", () => {
  const help = spawnSync(process.execPath, [entry, "init", "--help"], {
    cwd: os.tmpdir(),
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /init.*extract.*deliver.*verify/);
  assert.match(help.stdout, /resources\/website/);
  assert.doesNotMatch(help.stdout, /Hashing|Preparing/);
  const legacy = spawnSync(process.execPath, [entry, "extract", "--step", "structure"], {
    encoding: "utf8",
  });
  assert.notEqual(legacy.status, 0);
  assert.match(legacy.stderr, /Unknown option/);
});
