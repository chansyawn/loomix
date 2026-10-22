import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TestContext } from "vite-plus/test";
import { test } from "vite-plus/test";
import { runProcess } from "./process.ts";

function fixture(t: TestContext): { root: string; logFile: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix process's "));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, logFile: path.join(root, "logs/process.log") };
}

test("process preserves arguments, cwd, environment and both log streams", async (t) => {
  const { root, logFile } = fixture(t);
  const argument = "a 'quoted' $(literal) argument";
  const options = { cwd: root, logFile, env: { LOOMIX_PROCESS_TEST: "value" } };
  await runProcess(process.execPath, ["-e", "console.log('previous')"], options);
  await runProcess(
    process.execPath,
    [
      "-e",
      `
    console.log(JSON.stringify({cwd:process.cwd(),arg:process.argv[1],env:process.env.LOOMIX_PROCESS_TEST}));
    console.error('stderr');
  `,
      argument,
    ],
    options,
  );
  const log = fs.readFileSync(logFile, "utf8");
  assert.match(log, /previous/);
  assert.match(log, /stderr/);
  assert.ok(
    log.includes(JSON.stringify({ cwd: fs.realpathSync(root), arg: argument, env: "value" })),
  );
  await runProcess(process.execPath, ["-e", "console.log('replacement')"], {
    ...options,
    logMode: "truncate",
  });
  assert.equal(fs.readFileSync(logFile, "utf8").trim(), "replacement");
});

test("nonzero process retains complete output and identifies its log", async (t) => {
  const { logFile } = fixture(t);
  await assert.rejects(
    runProcess(
      process.execPath,
      [
        "-e",
        `
    process.stdout.write('x'.repeat(100000));
    console.error('failure details');
    process.exitCode = 7;
  `,
      ],
      { logFile },
    ),
    (error: Error) => {
      assert.match(error.message, /Process failed \(7\)/);
      assert.ok(error.message.includes(logFile));
      return true;
    },
  );
  const log = fs.readFileSync(logFile, "utf8");
  assert.equal(log.match(/x{100,}/g)?.join("").length, 100000);
  assert.match(log, /failure details/);
});

test("startup failure retains the underlying reason in its log", async (t) => {
  const { root, logFile } = fixture(t);
  await assert.rejects(
    runProcess(path.join(root, "no executable"), [], { logFile }),
    /Unable to start/,
  );
  assert.match(fs.readFileSync(logFile, "utf8"), /ENOENT/);
});
