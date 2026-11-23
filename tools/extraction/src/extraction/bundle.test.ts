import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { clientReadRecordsFixture } from "./fixtures/client-read-records.ts";
import { CLIENT_READ_RECORDS_FILE, DATASET_FILE, FIELD_EVIDENCE_FILE } from "./files.ts";
import { assemble } from "./assemble/index.ts";
import { writeAssembly, readCandidate, readVerifiedExtraction, sealExtraction } from "./bundle.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { STAGE_MANIFEST_VERSION } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";

async function build(staging: string, id: string): Promise<Manifest> {
  const observations = clientReadRecordsFixture(id);
  writeJson(path.join(staging, CLIENT_READ_RECORDS_FILE), observations);
  writeJson(path.join(staging, "originals.json"), []);
  writeJson(path.join(staging, "validation.json"), { passed: true, datasetId: id });
  writeAssembly(staging, assemble(observations, []));
  return {
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    kind: "extraction",
    id,
    status: "verified",
    createdAt: "2026-11-16T00:00:00Z",
    inputs: { id: digest("environment"), sha256: digest([]), files: [] },
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
  const directory = path.join(root, `0.95.2--${id.slice(0, 12)}`);
  const destination = { id, directory };
  try {
    await expect(
      sealExtraction(destination, async (staging) => {
        fs.writeFileSync(path.join(staging, "partial"), "partial");
        throw new Error("failed build");
      }),
    ).rejects.toThrow("failed build");
    expect(fs.existsSync(directory)).toBe(false);
    await expect(
      sealExtraction(destination, (staging) =>
        build(staging, `${id.slice(0, 12)}${"d".repeat(52)}`),
      ),
    ).rejects.toThrow("Extraction seal identity mismatch");
    await sealExtraction(destination, (staging) => build(staging, id));
    const before = await inventory(directory);
    fs.mkdirSync(path.join(root, "cache"));
    fs.rmSync(path.join(root, "cache"), { recursive: true });
    await sealExtraction(destination, async () => {
      throw new Error("must never rebuild a valid seal");
    });
    expect(await inventory(directory)).toEqual(before);
    expect((await readVerifiedExtraction(directory)).dataset.context.datasetId).toBe(id);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("仅在封存完整性损坏时隔离旧目录；新封存必须覆盖精确文件集", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-seal-corrupt-"));
  const id = "c".repeat(64);
  const directory = path.join(root, `0.95.2--${id.slice(0, 12)}`);
  const destination = { id, directory };
  try {
    await sealExtraction(destination, (staging) => build(staging, id));
    fs.writeFileSync(path.join(directory, DATASET_FILE), "corrupt");
    await sealExtraction(destination, (staging) => build(staging, id));
    expect((await readVerifiedExtraction(directory)).manifest.id).toBe(id);
    expect(fs.readdirSync(root).filter((name) => name.includes(".corrupt-"))).toHaveLength(1);
    fs.writeFileSync(path.join(directory, "unexpected"), "polluted");
    await expect(readVerifiedExtraction(directory)).rejects.toThrow("file set");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("封存要求统一的小栖地数据，且旧格式须重新提取", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-vignettes-"));
  try {
    const observations = clientReadRecordsFixture();
    writeJson(path.join(directory, CLIENT_READ_RECORDS_FILE), observations);
    writeJson(path.join(directory, "originals.json"), []);
    writeAssembly(directory, assemble(observations, []));
    const bundle = readCandidate(directory);
    expect(bundle.dataset.vignettes).toEqual({ templates: [], fallbackItems: [] });
    expect(readJson(path.join(directory, FIELD_EVIDENCE_FILE))).toMatchObject({
      kind: "field-evidence",
      datasetId: bundle.dataset.context.datasetId,
    });
    const { vignettes: _vignettes, ...incomplete } = bundle.dataset;
    writeJson(path.join(directory, DATASET_FILE), incomplete);
    expect(() => readCandidate(directory)).toThrow("vignettes");
    writeJson(path.join(directory, CLIENT_READ_RECORDS_FILE), {
      ...observations,
      context: { ...observations.context, formatVersion: 15 },
    });
    expect(() => readCandidate(directory)).toThrow("请重新提取");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
