import type { TestContext } from "node:test";
import type { PlatformOptions, RunProcess, ToolOptions } from "../types.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createAnimeStudio } from "../tool.ts";
import { runProcess } from "../process.ts";
import { withLock } from "../lock.ts";

const fixture = `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('fixture 1.0');
} else {
  const input = JSON.parse(fs.readFileSync(args[0]));
  if (input.log) console.error(input.log);
  fs.mkdirSync(args[1], {recursive:true});
  fs.writeFileSync(path.join(args[1], 'arguments.json'), JSON.stringify({args, runtime:process.env.DOTNET_ROOT_X64}));
  if (args.includes('--map_op') && !input.skipMap)
    fs.writeFileSync(path.join(args[1], 'assets_map.xml'), input.map ?? '<Assets>\\n<Asset>\\n</Asset>\\n</Assets>');
  process.exitCode = input.exit ?? 0;
}
`;

function environment(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anime studio's cache-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let preparations = 0;
  const prepare = async ({ directory, platform }: PlatformOptions) => {
    preparations++;
    await setTimeout(15);
    fs.mkdirSync(path.join(directory, "cli"), { recursive: true });
    fs.writeFileSync(
      path.join(directory, "cli", platform === "win32" ? "AnimeStudio.CLI.exe" : "AnimeStudio.CLI"),
      fixture,
    );
  };
  const run: RunProcess = (exe, args, options) =>
    runProcess(process.execPath, [exe, ...args], options);
  const create = (options: ToolOptions = {}) =>
    createAnimeStudio({
      root,
      platform: "darwin",
      architecture: "arm64",
      prepare,
      run,
      ...options,
    });
  const input = path.join(root, "input file.json");
  fs.writeFileSync(input, "{}");
  const output = path.join(root, "output file");
  return { root, input, output, create, prepare, count: () => preparations };
}

await test("lazy initialization, concurrent callers and separate instances share a cache", async (t) => {
  const env = environment(t);
  const first = env.create(),
    second = env.create();
  assert.equal(env.count(), 0);
  await Promise.all([
    first.ensureAnimeStudio(),
    first.ensureAnimeStudio(),
    second.ensureAnimeStudio(),
  ]);
  assert.equal(env.count(), 1);
  await env.create().ensureAnimeStudio();
  assert.equal(env.count(), 1);
});

await test("patch changes invalidate macOS cache; broken cached executable is rebuilt", async (t) => {
  const env = environment(t);
  await env.create({ patch: "patch-a" }).ensureAnimeStudio();
  await env.create({ patch: "patch-b" }).ensureAnimeStudio();
  assert.equal(env.count(), 2);
  const platformRoot = path.join(env.root, "osx-arm64");
  for (const directory of fs.readdirSync(platformRoot).filter((name) => !name.includes(".")))
    fs.rmSync(path.join(platformRoot, directory, "cli/AnimeStudio.CLI"));
  await env.create({ patch: "patch-b" }).ensureAnimeStudio();
  assert.equal(env.count(), 3);
});

await test("failed initialization is retryable without publishing a ready cache", async (t) => {
  const env = environment(t);
  let fail = true;
  const tool = env.create({
    prepare: async (options) => {
      await env.prepare(options);
      if (fail) throw new Error("build fixture failed");
    },
  });
  await assert.rejects(tool.ensureAnimeStudio(), /initialization failed.*build fixture failed/);
  const directory = path.join(env.root, "osx-arm64");
  assert.ok(fs.readdirSync(directory).every((name) => name.includes(".")));
  fail = false;
  await tool.ensureAnimeStudio();
  assert.equal(env.count(), 2);
});

await test("unsupported platforms fail before preparation", async (t) => {
  const env = environment(t);
  for (const [platform, architecture] of [
    ["linux", "x64"],
    ["win32", "arm64"],
    ["darwin", "ia32"],
  ])
    await assert.rejects(env.create({ platform, architecture }).ensureAnimeStudio(), /Unsupported/);
  assert.equal(env.count(), 0);
});

await test("export preserves exact filters and paths with spaces without shell interpretation", async (t) => {
  const env = environment(t);
  await env.create().exportAssets({
    input: env.input,
    output: env.output,
    game: "HYG_CB1",
    types: ["Sprite", "Texture2D"],
    names: ["^(A|B)$"],
    containers: ["^assets/test's folder/a.png$"],
  });
  const { args } = JSON.parse(fs.readFileSync(path.join(env.output, "arguments.json"), "utf8")) as {
    args: string[];
    runtime: string;
  };
  assert.deepEqual(args, [
    env.input,
    env.output,
    "--game",
    "HYG_CB1",
    "--types",
    "Sprite",
    "Texture2D",
    "--names",
    "^(A|B)$",
    "--containers",
    "^assets/test's folder/a.png$",
  ]);
});

await test("Windows uses pinned cache and supplies local x64 runtime to the process", async (t) => {
  const env = environment(t);
  const tool = env.create({ platform: "win32", architecture: "x64" });
  await tool.exportAssets({
    input: env.input,
    output: env.output,
    game: "HYG_CB1",
    types: ["MiHoYoBinData"],
  });
  const { runtime } = JSON.parse(
    fs.readFileSync(path.join(env.output, "arguments.json"), "utf8"),
  ) as { runtime: string };
  assert.ok(runtime.startsWith(path.join(env.root, "win-x64")));
  assert.equal(path.basename(runtime), "runtime");
  await env
    .create({ platform: "win32", architecture: "x64", patch: "ignored on Windows" })
    .ensureAnimeStudio();
  assert.equal(env.count(), 1);
});

await test("CLI nonzero exit and reported errors retain logs and reject", async (t) => {
  const env = environment(t),
    tool = env.create();
  const logFile = path.join(env.root, "export.log");
  for (const [input, expected] of [
    [{ exit: 7, log: "fixture failure" }, /Process failed \(7\)/],
    [{ log: "[Error] parse failed" }, /reported an error/],
    [{ log: "System.IO.IOException: failed" }, /reported an error/],
  ] as const) {
    fs.writeFileSync(env.input, JSON.stringify(input));
    await assert.rejects(
      tool.exportAssets({
        input: env.input,
        output: env.output,
        game: "HYG_CB1",
        types: ["Sprite"],
        logFile,
      }),
      expected,
    );
    assert.ok(fs.readFileSync(logFile, "utf8").includes(input.log));
  }
});

await test("index publication replaces only a complete map and preserves an existing map on failure", async (t) => {
  const env = environment(t),
    tool = env.create();
  const options = { input: env.input, output: env.output, game: "HYG_CB1" };
  const destination = await tool.buildAssetMap(options);
  const original = fs.readFileSync(destination, "utf8");
  for (const input of [
    { map: "<Assets>\n<Asset>" },
    { skipMap: true },
    { map: "<Assets>\n</Assets>" },
  ]) {
    fs.writeFileSync(env.input, JSON.stringify(input));
    await assert.rejects(tool.buildAssetMap(options));
    assert.equal(fs.readFileSync(destination, "utf8"), original);
    assert.ok(fs.readdirSync(env.output).every((name) => !name.startsWith(".index-")));
  }
});

await test("invalid inputs do not initialize the tool", async (t) => {
  const env = environment(t),
    tool = env.create();
  await assert.rejects(
    tool.exportAssets({ input: env.input, output: env.output, game: "HYG_CB1", types: [] }),
    /types/,
  );
  await assert.rejects(
    tool.exportAssets({
      input: path.join(env.root, "missing"),
      output: env.output,
      game: "HYG_CB1",
      types: ["Sprite"],
    }),
    /Missing/,
  );
  assert.equal(env.count(), 0);
});

await test("lock timeouts explain where to inspect a blocked initialization", async (t) => {
  const env = environment(t),
    directory = path.join(env.root, "cache.lock");
  fs.mkdirSync(directory);
  await assert.rejects(
    withLock(directory, () => assert.fail(), { timeout: 10, interval: 5 }),
    /Timed out.*cache.lock/,
  );
});

await test("process startup failure writes the reason to its log", async (t) => {
  const env = environment(t),
    logFile = path.join(env.root, "spawn.log");
  await assert.rejects(
    runProcess(path.join(env.root, "no executable"), [], { logFile }),
    /Unable to start/,
  );
  assert.match(fs.readFileSync(logFile, "utf8"), /ENOENT/);
});

await test("an interrupted process does not leave an unrecoverable initialization lock", async (t) => {
  const env = environment(t),
    directory = path.join(env.root, "cache.lock");
  const child = spawnSync(process.execPath, ["-e", "console.log(process.pid)"], {
    encoding: "utf8",
  });
  assert.equal(child.status, 0);
  fs.mkdirSync(directory);
  fs.writeFileSync(
    path.join(directory, "owner.json"),
    JSON.stringify({ pid: Number(child.stdout.trim()) }),
  );
  assert.equal(
    await withLock(directory, () => "recovered", { interval: 5, timeout: 1000 }),
    "recovered",
  );
  assert.ok(!fs.existsSync(directory));
});
