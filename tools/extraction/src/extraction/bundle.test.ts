import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { observationFixture } from "./fixtures/observations.ts";
import { assemble } from "./assemble/index.ts";
import { writeAssembly, readVerifiedExtraction, sealExtraction } from "./bundle.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { writeJson } from "../workflow/json.ts";
import type { Manifest } from "../workflow/manifest.ts";

async function build(staging: string, id: string): Promise<Manifest> {
  const observations = observationFixture(id);
  writeJson(path.join(staging, "observations.json"), observations);
  writeJson(path.join(staging, "originals.json"), []);
  writeJson(path.join(staging, "validation.json"), { passed: true });
  writeAssembly(staging, assemble(observations, []));
  return {
    schemaVersion: 1,
    kind: "extraction",
    id,
    status: "verified",
    createdAt: "2026-11-16T00:00:00Z",
    inputs: { id: "environment", sha256: digest([]), files: [] },
    implementation: "a".repeat(64),
    profileHash: "b".repeat(64),
    tools: {},
    outputs: await inventory(staging),
    result: { passed: true, validation: "passed", failures: [] },
  };
}

test("失败构建不封存；有效结果验证后复用，不调用会失败的构建，也不依赖缓存存活", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-seal-"));
  const id = "c".repeat(64);
  const directory = path.join(root, id);
  try {
    await expect(
      sealExtraction(directory, async (staging) => {
        fs.writeFileSync(path.join(staging, "partial"), "partial");
        throw new Error("failed build");
      }),
    ).rejects.toThrow("failed build");
    expect(fs.existsSync(directory)).toBe(false);
    await sealExtraction(directory, (staging) => build(staging, id));
    const before = await inventory(directory);
    fs.mkdirSync(path.join(root, "cache"));
    fs.rmSync(path.join(root, "cache"), { recursive: true });
    await sealExtraction(directory, async () => {
      throw new Error("must never rebuild a valid seal");
    });
    expect(await inventory(directory)).toEqual(before);
    expect((await readVerifiedExtraction(directory)).dataset.context.snapshotId).toBe(id);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("仅在封存完整性损坏时隔离旧目录；新封存必须覆盖精确文件集", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-seal-corrupt-"));
  const id = "c".repeat(64);
  const directory = path.join(root, id);
  try {
    await sealExtraction(directory, (staging) => build(staging, id));
    fs.writeFileSync(path.join(directory, "dataset.json"), "corrupt");
    await sealExtraction(directory, (staging) => build(staging, id));
    expect((await readVerifiedExtraction(directory)).manifest.id).toBe(id);
    expect(fs.readdirSync(root).filter((name) => name.includes(".corrupt-"))).toHaveLength(1);
    fs.writeFileSync(path.join(directory, "unexpected"), "polluted");
    await expect(readVerifiedExtraction(directory)).rejects.toThrow("file set");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
