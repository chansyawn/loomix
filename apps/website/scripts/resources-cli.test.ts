import { writeFixture } from "../../../tools/resources/tests/fixture.ts";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";
import { FORMAT_VERSION } from "@loomix/schema/common";

const cli = fileURLToPath(new URL("./resources-cli.ts", import.meta.url));
const env = { ...process.env };
delete env.CLOUDFLARE_ACCOUNT_ID;
delete env.R2_ACCESS_KEY_ID;
delete env.R2_SECRET_ACCESS_KEY;

test("帮助列出全部子命令且无需凭证", () => {
  const result = spawnSync(process.execPath, [cli, "--help"], { env, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  for (const command of ["publish", "verify", "list", "gc", "upload"])
    expect(result.stdout).toContain(`vp run resources ${command}`);
  expect(result.stdout).not.toContain("--no-cache");
  expect(result.stderr).toBe("");
});

test("dry run from another directory returns only JSON without credentials or progress", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-cli-"));
  try {
    await writeFixture(directory, 0);
    const result = spawnSync(
      process.execPath,
      [cli, "upload", "--content", directory, "--bucket", "alternate", "--dry-run"],
      { cwd: tmpdir(), env, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      release: expect.stringMatching(new RegExp(`^\\d{8}-gtest-f${FORMAT_VERSION}-r001$`)),
      assetCount: 0,
      documentCount: 6,
      manifestSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      dryRun: true,
      reserved: false,
    });
    expect(result.stderr).toBe("");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test.each([
  [["upload", "--release", "manual", "--dry-run"], "--release"],
  [["publish", "--content", "custom"], "--content"],
  [["verify", "--local", "--url", "https://example.test/releases/demo/"], "互斥"],
  [["list", "--apply", "wrong"], "--apply"],
  [["unknown"], "未知资源命令"],
])("拒绝无效命令参数 %j", (args, message) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    env,
    encoding: "utf8",
  });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain(message);
});
