import { test } from "vite-plus/test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./cli.ts", import.meta.url));
const id = "a".repeat(64);

function run(...args: string[]) {
  return spawnSync(process.execPath, [entry, ...args], { cwd: os.tmpdir(), encoding: "utf8" });
}

test("帮助可从工作区之外调用，且不初始化客户端或工具", () => {
  for (const args of [
    ["--help"],
    ["client", "--help"],
    ["client", "--", "import", "--help"],
    ["refresh", "--help"],
    ["package", "--", "--help"],
  ]) {
    const help = run(...args);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /package --extraction ID/);
    assert.match(help.stdout, /refresh \[--snapshot ID\]/);
    assert.match(help.stdout, /install-resources --resource-package ID/);
    assert.match(help.stdout, /resources\/website/);
    assert.equal(help.stderr, "");
  }
});

test("命令拒绝无效 ID、多余参数和旧命令", () => {
  for (const [args, expected] of [
    [["extract", "--step", "structure"], /Unknown option/],
    [["init", "--extraction", id], /Unknown option/],
    [["refresh", "extra"], /Unexpected argument/],
    [["client", "import", "extra"], /Unexpected argument/],
    [["client", "import", "--source="], /Empty --source/],
    [["client", "import"], /Missing --source/],
    [["client", "import", "--source", "one", "--source", "two"], /Repeated option/],
    [["client", "select", "--snapshot", id], /Unknown command/],
    [["init", "--snapshot", "short"], /Invalid snapshot identity/],
    [["refresh", "--snapshot="], /Invalid snapshot identity/],
    [["extract", "--environment", "short"], /Invalid environment identity/],
    [["package", "--extraction", "short"], /Invalid extraction identity/],
    [["package", "--extraction", id, "--extraction", id], /Repeated option/],
    [["package", "--extraction", id, "--website"], /Unknown option/],
    [["verify", "--resource-package", "short"], /Invalid resource-package identity/],
    [["install-resources"], /Missing --resource-package ID/],
    [["deliver", "--extraction", id], /Unknown command/],
    [["materialize", "--delivery", id], /Unknown command/],
  ] as const) {
    const result = run(...args);
    assert.notEqual(result.status, 0, args.join(" "));
    assert.match(result.stderr, expected);
    assert.equal(result.stdout, "");
  }
});
