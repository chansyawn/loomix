import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { loadReleaseDirectory } from "../src/load.ts";
import { writeFixture } from "./fixture.ts";

let directory: string | undefined;

async function createFixture(): Promise<string> {
  const value = await mkdtemp(path.join(os.tmpdir(), "loomix-load-"));
  directory = value;
  return value;
}

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

test("读取已 materialize 的 release，不依赖图片字节", async () => {
  const value = await createFixture();
  await writeFixture(value);
  const release = await loadReleaseDirectory(value);
  expect(release.manifest.formatVersion).toBe(11);
  expect(release.dataset.catalog.items).toHaveLength(1);
  expect(release.assets.images).toHaveLength(1);
});

test("拒绝被篡改的文档", async () => {
  const value = await createFixture();
  await writeFixture(value);
  await writeFile(path.join(value, "zh-CN/catalog.json"), "{}");
  await expect(loadReleaseDirectory(value)).rejects.toThrow(
    "Document SHA-256 or size mismatch: zh-CN/catalog.json",
  );
});

test("缺少 release 清单时提示先 materialize", async () => {
  const value = await createFixture();
  await expect(loadReleaseDirectory(value)).rejects.toThrow("未找到本地 release");
});

test("缺少清单声明的文档时提示重新 materialize", async () => {
  const value = await createFixture();
  await writeFixture(value);
  await rm(path.join(value, "zh-CN/catalog.json"));
  await expect(loadReleaseDirectory(value)).rejects.toThrow(
    "本地 release 缺少文档：zh-CN/catalog.json",
  );
});
