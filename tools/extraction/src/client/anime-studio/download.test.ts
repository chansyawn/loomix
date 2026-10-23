import type { DownloadOptions } from "./types.ts";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { test, vi } from "vite-plus/test";
import { download, unpack } from "./download.ts";
import { preparePlatform } from "./platforms.ts";
import { version } from "./config.ts";

test("downloads verify digest, reject expired builds and remove partial data", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anime-download-"));
  const bytes = Buffer.from("archive fixture");
  const server = http.createServer((request, response) => {
    if (request.url === "/expired") response.writeHead(404).end();
    else response.end(bytes);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.onTestFinished(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    fs.rmSync(root, { recursive: true, force: true });
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const destination = path.join(root, "tool.zip");
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  await download(url, destination, { hash });
  assert.deepEqual(fs.readFileSync(destination), bytes);
  await assert.rejects(download(url, destination, { hash: "incorrect" }), /Checksum mismatch/);
  assert.deepEqual(fs.readFileSync(destination), bytes);
  await assert.rejects(download(`${url}/expired`, destination, { hash }), /404.*expired/);
  assert.deepEqual(fs.readdirSync(root), ["tool.zip"]);
});

test("Windows archive paths are passed through environment rather than PowerShell code", async (t) => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), "anime-unpack-"));
  t.onTestFinished(() => fs.rmSync(destination, { recursive: true, force: true }));
  const archive = "C:\\a folder\\it's $archive.zip";
  await unpack(archive, destination, {
    platform: "win32",
    run: async (exe, args, options) => {
      assert.equal(exe, "powershell.exe");
      assert.ok(args.includes("-NonInteractive"));
      assert.ok(!args.join(" ").includes(archive));
      assert.equal(options?.env?.ANIMESTUDIO_ARCHIVE, archive);
      assert.equal(options?.env?.ANIMESTUDIO_DESTINATION, destination);
    },
  });
});

test("Windows preparation downloads pinned CLI plus standard runtime and preserves bin layout", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anime-windows-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "staging"),
    work = path.join(root, "work");
  fs.mkdirSync(directory);
  const runtimeHash = "runtime fixture digest";
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({
      releases: [
        {
          runtime: {
            version: version.runtime,
            files: [
              {
                rid: "win-x64",
                name: "dotnet-runtime-win-x64.zip",
                url: "https://example.test/runtime.zip",
                hash: runtimeHash,
              },
            ],
          },
        },
      ],
    }),
  );
  const requests: { url: string; checksum: DownloadOptions }[] = [];
  await preparePlatform({
    directory,
    work,
    rid: "win-x64",
    platform: "win32",
    run: () => assert.fail("fixture archives should not need an external command"),
    fetchFile: async (url, file, checksum) => {
      requests.push({ url, checksum });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "fixture archive");
    },
    extract: async (file, target) => {
      if (file.endsWith("animestudio.zip")) {
        const tool = path.join(target, `AnimeStudio-net10-${version.revision}`);
        fs.mkdirSync(path.join(tool, "bin"), { recursive: true });
        fs.writeFileSync(path.join(tool, "AnimeStudio.CLI.exe"), "fixture launcher");
        fs.writeFileSync(path.join(tool, "bin/AnimeStudio.CLI.dll"), "fixture assembly");
      } else {
        const shared = path.join(target, "shared/Microsoft.NETCore.App", version.runtime);
        fs.mkdirSync(shared, { recursive: true });
        fs.writeFileSync(path.join(shared, "System.Private.CoreLib.dll"), "fixture core library");
        fs.writeFileSync(path.join(target, "dotnet.exe"), "fixture runtime");
      }
    },
  });
  assert.deepEqual(requests, [
    { url: version.windows.url, checksum: { hash: version.windows.sha256 } },
    {
      url: "https://example.test/runtime.zip",
      checksum: { hash: runtimeHash, algorithm: "sha512" },
    },
  ]);
  assert.ok(fs.existsSync(path.join(directory, "cli/AnimeStudio.CLI.exe")));
  assert.ok(fs.existsSync(path.join(directory, "cli/bin/AnimeStudio.CLI.dll")));
  assert.ok(fs.existsSync(path.join(directory, "runtime/dotnet.exe")));
});
