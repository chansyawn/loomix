import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { digest, inventory } from "../workflow/hashing.ts";
import {
  publishManifest,
  readManifest,
  resolveStage,
  STAGE_MANIFEST_VERSION,
  stageInputs,
  stageManifestFile,
  stageOutput,
} from "../workflow/manifest.ts";
import { clientReadRecordsFixture } from "../extraction/fixtures/client-read-records.ts";
import {
  extractionIdentityFixture,
  freezeAdmissionsFixture,
  freezeFlowerFixture,
} from "../extraction/fixtures/flower-hybridization.ts";
import { extractionId as computeExtractionId } from "../workflow/extraction-identity.ts";
import { CLIENT_READ_RECORDS_FILE } from "../extraction/files.ts";
import { assemble } from "../extraction/assemble/index.ts";
import { writeAssembly } from "../extraction/bundle.ts";
import { writeJson } from "../workflow/json.ts";
import { buildResourcePackage } from "./build.ts";
import { installLocalResources } from "./install.ts";
import { IMAGE_PROCESSING_REPORT_FILE, WEBSITE_RESOURCE_DIRECTORY } from "./files.ts";
import { verifyResourcePackage } from "../verify.ts";

vi.mock("../workflow/identity.ts", () => ({
  profileHash: "a".repeat(64),
  implementationRevision: async () => "b".repeat(64),
}));
vi.mock("../extraction/verify.ts", async () => ({
  verifyExtraction: (await import("../extraction/bundle.ts")).readVerifiedExtraction,
}));
vi.mock("../environment/verify.ts", () => ({
  verifyEnvironment: (directory: string) => readManifest(directory, "environment"),
}));

const workspace = vi.hoisted(() => ({ root: "" }));
vi.mock("../paths.ts", async (original) => ({
  ...(await original<typeof import("../paths.ts")>()),
  get websiteDirectory() {
    return `${workspace.root}/installed`;
  },
  cacheRoot: () => `${workspace.root}/cache`,
  artifactsRoot: () => workspace.root,
}));

let extractionId: string;
const environmentId = "d".repeat(64);
const clientSnapshotId = digest([]);
const snapshotName = `0.95.2-d1449213-r1391927-m5662883--${clientSnapshotId.slice(0, 12)}`;
const stage = {
  stageManifestVersion: STAGE_MANIFEST_VERSION,
  status: "verified",
  createdAt: "2026-10-26T00:00:00.000Z",
  implementation: "b".repeat(64),
  profileHash: "a".repeat(64),
  tools: { animeStudio: digest("tool") },
  result: { passed: true, validation: "passed", failures: [] },
} as const;

beforeEach(async () => {
  workspace.root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-package-"));
  const installed = path.join(workspace.root, "installed");
  fs.mkdirSync(installed);
  fs.writeFileSync(path.join(installed, ".gitkeep"), "placeholder");
  const { directory: environment } = stageOutput("environment", environmentId, snapshotName);
  fs.mkdirSync(environment, { recursive: true });
  writeJson(path.join(environment, "fixture.json"), {});
  await publishManifest(environment, {
    ...stage,
    result: { ...stage.result, failures: [] },
    kind: "environment",
    id: environmentId,
    clientSnapshotId,
    inputs: { id: clientSnapshotId, files: [], sha256: clientSnapshotId },
    outputs: await inventory(environment),
  });
  const inputs = await stageInputs(environment, await readManifest(environment, "environment"));
  const records = clientReadRecordsFixture();
  const flower = freezeFlowerFixture(workspace.root, records.source);
  const identityInputs = extractionIdentityFixture(inputs, stage, flower.sha256);
  extractionId = computeExtractionId(identityInputs);
  records.context.datasetId = extractionId;
  const { directory: bundle } = stageOutput("extraction", extractionId, environment);
  fs.mkdirSync(bundle, { recursive: true });
  fs.renameSync(path.join(workspace.root, "source"), path.join(bundle, "source"));
  freezeAdmissionsFixture(bundle);
  writeJson(path.join(bundle, CLIENT_READ_RECORDS_FILE), records);
  writeJson(path.join(bundle, "originals.json"), []);
  writeJson(path.join(bundle, "validation.json"), { passed: true, datasetId: extractionId });
  writeAssembly(bundle, assemble(records, [], flower));
  await publishManifest(bundle, {
    ...stage,
    result: { ...stage.result, failures: [] },
    kind: "extraction",
    id: extractionId,
    inputs,
    identityInputs,
    outputs: await inventory(bundle),
  });
});

afterEach(() => fs.rmSync(workspace.root, { recursive: true, force: true }));

test("同一提取结果重复打包时复验并复用封存，安装后的资源字节与包内一致", async () => {
  const installed = path.join(workspace.root, "installed");
  const before = await inventory(installed);
  const resourcePackage = await buildResourcePackage(extractionId);
  const { directory } = resourcePackage;
  const sealed = await inventory(directory);
  const extractionDirectory = resolveStage("extraction", extractionId).directory;
  expect(await buildResourcePackage(path.basename(extractionDirectory))).toEqual(resourcePackage);
  expect(await inventory(directory)).toEqual(sealed);
  expect(await inventory(installed)).toEqual(before);
  const manifest = await verifyResourcePackage(resourcePackage);
  expect(manifest.inputs.files.map((file) => file.path)).toContain(CLIENT_READ_RECORDS_FILE);
  expect(manifest.outputs.map((file) => file.path)).toContain(IMAGE_PROCESSING_REPORT_FILE);
  expect(await installLocalResources(path.basename(directory))).toEqual(resourcePackage);
  expect((await inventory(installed)).filter(({ path }) => path !== ".gitkeep")).toEqual(
    await inventory(path.join(directory, WEBSITE_RESOURCE_DIRECTORY)),
  );
  expect(fs.readFileSync(path.join(installed, ".gitkeep"), "utf8")).toBe("placeholder");
});

test("资源包拒绝上游清单变化与多余文件，并隔离损坏目录后重建", async () => {
  const resourcePackage = await buildResourcePackage(extractionId);
  const { id, directory } = resourcePackage;
  const { directory: environment } = resolveStage("environment", environmentId);
  const file = path.join(environment, stageManifestFile("environment"));
  const original = fs.readFileSync(file);
  const manifest = await readManifest(environment, "environment");
  await publishManifest(environment, { ...manifest, createdAt: "2026-10-27T00:00:00.000Z" });
  await expect(verifyResourcePackage(resourcePackage)).rejects.toThrow(
    "input inventory does not match environment",
  );
  fs.writeFileSync(file, original);
  fs.writeFileSync(path.join(directory, "unrelated.json"), "{}");
  await expect(verifyResourcePackage(resourcePackage)).rejects.toThrow(
    "Sealed resource package file set",
  );
  expect(await buildResourcePackage(extractionId)).toEqual(resourcePackage);
  expect((await verifyResourcePackage(resourcePackage)).id).toBe(id);
  expect(
    fs
      .readdirSync(path.dirname(directory))
      .some((name) => name.startsWith(`${path.basename(directory)}.corrupt-`)),
  ).toBe(true);
});

test("打包、验收和安装遇到旧阶段格式时提示重新生成", async () => {
  const resourcePackage = await buildResourcePackage(extractionId);
  const { directory: bundle } = resolveStage("extraction", extractionId);
  const extraction = await readManifest(bundle, "extraction");
  for (const stageManifestVersion of [3, 4, 5, 6]) {
    writeJson(path.join(bundle, stageManifestFile("extraction")), {
      ...extraction,
      stageManifestVersion,
    });
    await expect(buildResourcePackage(extractionId)).rejects.toThrow(/refresh/);
    await expect(verifyResourcePackage(resourcePackage)).rejects.toThrow(/refresh/);
    await expect(installLocalResources(resourcePackage.id)).rejects.toThrow(/refresh/);
  }
  expect(fs.readdirSync(path.join(workspace.root, "installed"))).toEqual([".gitkeep"]);
});
