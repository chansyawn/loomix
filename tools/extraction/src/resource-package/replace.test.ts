import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import { documentPath, WEBSITE_RESOURCE_MANIFEST_FILE } from "@loomix/schema/website-resources";
import { inventory } from "../workflow/hashing.ts";
import { safeOutput } from "./output.ts";
import { replaceLocalResources } from "./replace.ts";

const indexFile = documentPath("image-index", "zh-CN");

async function fixture(onFinished: (cleanup: () => void) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-install-"));
  onFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, "installed");
  const source = path.join(root, "package-website");
  for (const [directory, version, hash] of [
    [output, "old", "a"],
    [source, "new", "b"],
  ]) {
    fs.mkdirSync(path.join(directory, "assets"), { recursive: true });
    fs.writeFileSync(path.join(directory, WEBSITE_RESOURCE_MANIFEST_FILE), version);
    fs.writeFileSync(path.join(directory, indexFile), version);
    fs.writeFileSync(path.join(directory, "assets", `${hash.repeat(64)}.webp`), version);
  }
  fs.writeFileSync(path.join(output, ".gitkeep"), "keep");
  return {
    root,
    output,
    source,
    expected: await inventory(source),
    previous: await inventory(output),
  };
}

test("安装保留占位文件并替换全部原有资源", async ({ onTestFinished }) => {
  const { source, output, expected } = await fixture(onTestFinished);
  await replaceLocalResources(source, output, expected);
  assert.deepEqual(
    (await inventory(output)).filter((file) => file.path !== ".gitkeep"),
    expected,
  );
  assert.equal(fs.readFileSync(path.join(output, ".gitkeep"), "utf8"), "keep");
});

test("资源字节变化时保留原目录", async ({ onTestFinished }) => {
  const { source, output, expected, previous } = await fixture(onTestFinished);
  fs.writeFileSync(path.join(source, indexFile), "changed");
  await assert.rejects(replaceLocalResources(source, output, expected), /bytes changed/);
  assert.deepEqual(await inventory(output), previous);
});

test("切换目录失败时恢复全部原有资源", async ({ onTestFinished }) => {
  const { root, source, output, expected, previous } = await fixture(onTestFinished);
  await assert.rejects(
    replaceLocalResources(source, output, expected, (from, to) => {
      if (to === output) throw new Error("injected rename failure");
      fs.renameSync(from, to);
    }),
    /injected rename failure/,
  );
  assert.deepEqual(await inventory(output), previous);
  assert.deepEqual(fs.readdirSync(root).sort(), ["installed", "package-website"]);
});

test("安装拒绝旧清单、非资源文件和符号链接", async ({ onTestFinished }) => {
  const { root, source, output, expected, previous } = await fixture(onTestFinished);
  const alias = path.join(root, "alias");
  fs.symlinkSync(output, alias, "junction");
  assert.throws(() => safeOutput(path.join(alias, "new")), /link/);
  for (const name of ["release.json", "unrelated.json"]) {
    fs.writeFileSync(path.join(output, name), "{}");
    await assert.rejects(replaceLocalResources(source, output, expected), /unrelated/);
    fs.unlinkSync(path.join(output, name));
  }
  fs.symlinkSync("missing.json", path.join(source, "alias.json"));
  await assert.rejects(replaceLocalResources(source, output, expected), /link/);
  fs.unlinkSync(path.join(source, "alias.json"));
  fs.mkdirSync(path.join(source, "evidence"));
  await assert.rejects(replaceLocalResources(source, output, expected), /unrelated/);
  assert.deepEqual(await inventory(output), previous);
});
