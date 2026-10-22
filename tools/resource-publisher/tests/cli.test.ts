import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyContent } from "@loomix/content-schema";
import { expect, test } from "vite-plus/test";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const env = { ...process.env };
delete env.CLOUDFLARE_ACCOUNT_ID;
delete env.R2_ACCESS_KEY_ID;
delete env.R2_SECRET_ACCESS_KEY;

test("help describes automatic configuration without requiring credentials", () => {
  const result = spawnSync(process.execPath, [cli, "--help"], { env, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("tools/resource-publisher/.env");
  expect(result.stdout).not.toContain("--no-cache");
  expect(result.stderr).toBe("");
});

test("dry run from another directory returns only JSON without credentials or progress", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-cli-"));
  try {
    await mkdir(path.join(directory, "assets"));
    await writeFile(path.join(directory, "content.json"), JSON.stringify(emptyContent()));
    const result = spawnSync(
      process.execPath,
      [cli, "--content", directory, "--release", "test", "--dry-run"],
      { cwd: tmpdir(), env, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      release: "test",
      assetCount: 0,
      dryRun: true,
    });
    expect(result.stderr).toBe("");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
