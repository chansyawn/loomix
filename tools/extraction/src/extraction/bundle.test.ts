import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { clientReadRecordsFixture } from "./fixtures/client-read-records.ts";
import {
  emptyFlowerHybridization,
  extractionIdentityFixture,
  freezeAdmissionsFixture,
  freezeFlowerFixture,
} from "./fixtures/flower-hybridization.ts";
import { CLIENT_READ_RECORDS_FILE, DATASET_FILE, FIELD_EVIDENCE_FILE } from "./files.ts";
import { assemble } from "./assemble/index.ts";
import { writeAssembly, readCandidate, readVerifiedExtraction, sealExtraction } from "./bundle.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { STAGE_MANIFEST_VERSION, stageManifestFile } from "../workflow/manifest.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { extractionId } from "../workflow/extraction-identity.ts";
import { flowerHybridizationFile } from "./external/flower-hybridization.ts";

const inputs = { id: digest("environment"), sha256: digest([]), files: [] };
const implementation = "a".repeat(64);
const profileHash = "b".repeat(64);
const tools = { animeStudio: digest("tool") };
const identityInputs = extractionIdentityFixture(
  inputs,
  { implementation, profileHash, tools },
  emptyFlowerHybridization(clientReadRecordsFixture().source).sha256,
);

async function build(staging: string, id: string): Promise<Manifest> {
  const observations = clientReadRecordsFixture(id);
  writeJson(path.join(staging, CLIENT_READ_RECORDS_FILE), observations);
  writeJson(path.join(staging, "originals.json"), []);
  writeJson(path.join(staging, "validation.json"), { passed: true, datasetId: id });
  freezeAdmissionsFixture(staging);
  const flower = freezeFlowerFixture(staging, observations.source);
  writeAssembly(staging, assemble(observations, [], flower));
  return {
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    kind: "extraction",
    id,
    status: "verified",
    createdAt: "2026-11-16T00:00:00Z",
    inputs,
    identityInputs,
    implementation,
    profileHash,
    tools,
    outputs: await inventory(staging),
    result: { passed: true, validation: "passed", failures: [] },
  };
}

test("失败构建不封存；有效结果验证后复用，不调用会失败的构建，也不依赖缓存存活", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-seal-"));
  const id = extractionId(identityInputs);
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
  const id = extractionId(identityInputs);
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
    const flower = freezeFlowerFixture(directory, observations.source);
    writeAssembly(directory, assemble(observations, [], flower));
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

test("重写外部 JSON 和输出清单不能沿用原提取身份", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-seal-external-"));
  const id = extractionId(identityInputs);
  const directory = path.join(root, `0.95.2--${id.slice(0, 12)}`);
  try {
    await sealExtraction({ id, directory }, (staging) => build(staging, id));
    const { manifest } = await readVerifiedExtraction(directory, id);
    const file = `source/${flowerHybridizationFile}`;
    fs.appendFileSync(path.join(directory, file), "\n");
    const manifestFile = stageManifestFile("extraction");
    const outputs = (await inventory(directory)).filter(({ path }) => path !== manifestFile);
    writeJson(path.join(directory, manifestFile), { ...manifest, outputs });
    await expect(readVerifiedExtraction(directory, id)).rejects.toThrow(
      "Frozen external input identity",
    );
    const { sha256 } = outputs.find(({ path }) => path === file)!;
    const changedInputs = { ...identityInputs, external: [{ path: file, sha256 }] };
    expect(extractionId(changedInputs)).not.toBe(id);
    writeJson(path.join(directory, manifestFile), {
      ...manifest,
      identityInputs: changedInputs,
      outputs,
    });
    await expect(readVerifiedExtraction(directory, id)).rejects.toThrow("identity inputs mismatch");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
