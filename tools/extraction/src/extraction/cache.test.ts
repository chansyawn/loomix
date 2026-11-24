import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { cachedDirectory } from "./cache.ts";

test("缓存验证完整文件集和字节，输入、工具或实现变化均使解码缓存失效", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-cache-"));
  let builds = 0;
  const build = async (directory: string) => {
    builds++;
    fs.writeFileSync(path.join(directory, "value"), "decoded");
    fs.mkdirSync(path.join(directory, "bindata"));
    fs.writeFileSync(path.join(directory, "bindata", "data.json"), "{}");
    fs.writeFileSync(path.join(directory, "bindata-manifest.json"), "{}");
  };
  try {
    const input = { input: "source", tool: "tool-bytes", implementation: "source-revision" };
    const directory = await cachedDirectory(root, input, build);
    await cachedDirectory(root, input, build);
    expect(builds).toBe(1);
    fs.writeFileSync(path.join(directory, "value"), "changed");
    await cachedDirectory(root, input, build);
    expect(builds).toBe(2);
    fs.writeFileSync(path.join(directory, "extra"), "pollution");
    await cachedDirectory(root, input, build);
    expect(builds).toBe(3);
    fs.writeFileSync(path.join(directory, "receipt.json"), "{}");
    await cachedDirectory(root, input, build);
    expect(builds).toBe(4);
    for (const field of ["input", "tool", "implementation"] as const)
      await cachedDirectory(root, { ...input, [field]: "changed" }, build);
    expect(builds).toBe(7);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("相同缓存身份并发只提交一次，失败输出不会成为成功缓存", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-cache-concurrent-"));
  let builds = 0;
  try {
    const build = async (directory: string) => {
      builds++;
      fs.writeFileSync(path.join(directory, "value"), "complete");
    };
    const results = await Promise.all([
      cachedDirectory(root, { key: 1 }, build),
      cachedDirectory(root, { key: 1 }, build),
    ]);
    expect(new Set(results).size).toBe(1);
    expect(builds).toBe(1);
    await expect(
      cachedDirectory(root, { key: 2 }, async (directory) => {
        fs.writeFileSync(path.join(directory, "partial"), "partial");
        throw new Error("interrupt");
      }),
    ).rejects.toThrow("interrupt");
    expect(fs.readdirSync(root).filter((name) => name !== "failures")).toHaveLength(1);
    expect(fs.readdirSync(path.join(root, "failures"))).toHaveLength(1);
    await cachedDirectory(root, { key: 2 }, build);
    expect(builds).toBe(2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
