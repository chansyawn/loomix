import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { loadWebsiteResources, validateWebsiteResources } from "../src/website-resources.ts";
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

test("读取已安装的网站资源，无需图片字节", async () => {
  const value = await createFixture();
  await writeFixture(value);
  const { manifest, dataset, imageIndex } = await loadWebsiteResources(value);
  expect(manifest.formatVersion).toBe(FORMAT_VERSION);
  expect(dataset.catalog.items).toHaveLength(1);
  expect(imageIndex.images).toHaveLength(1);
});

test("拒绝被篡改的星海文档", async () => {
  const value = await createFixture();
  await writeFixture(value);
  await writeFile(path.join(value, "zh-CN/vignettes.json"), "{}");
  await expect(loadWebsiteResources(value)).rejects.toThrow(
    "Document SHA-256 or size mismatch: zh-CN/vignettes.json",
  );
});

test("缺少网站资源清单时提示安装本地资源", async () => {
  const value = await createFixture();
  await expect(loadWebsiteResources(value)).rejects.toThrow("未找到本地网站资源清单");
  await expect(validateWebsiteResources(value)).rejects.toThrow("未找到本地网站资源清单");
});

test("缺少清单声明的文档时提示重新安装", async () => {
  const value = await createFixture();
  await writeFixture(value);
  await rm(path.join(value, "zh-CN/catalog.json"));
  await expect(loadWebsiteResources(value)).rejects.toThrow(
    "本地网站资源缺少文档：zh-CN/catalog.json",
  );
});
