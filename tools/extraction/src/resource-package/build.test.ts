import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { digest, inventory } from "../workflow/hashing.ts";
import {
  publishManifest,
  readManifest,
  STAGE_MANIFEST_VERSION,
  stageInputs,
  stageManifestFile,
} from "../workflow/manifest.ts";
import { clientReadRecordsFixture } from "../extraction/fixtures/client-read-records.ts";
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
  identityDirectory: (kind: string, id: string) => `${workspace.root}/${kind}/${id}`,
}));

const extractionId = "c".repeat(64);
const environmentId = "d".repeat(64);
const clientSnapshotId = digest([]);
const stage = {
  schemaVersion: STAGE_MANIFEST_VERSION,
  status: "verified",
  createdAt: "2026-10-26T00:00:00.000Z",
  implementation: "b".repeat(64),
  profileHash: "a".repeat(64),
  tools: {},
  result: { passed: true, validation: "passed", failures: [] },
} as const;

beforeEach(async () => {
  workspace.root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-package-"));
  const installed = path.join(workspace.root, "installed");
  fs.mkdirSync(installed);
  fs.writeFileSync(path.join(installed, ".gitkeep"), "placeholder");
  const environment = path.join(workspace.root, "environments", environmentId);
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
  const bundle = path.join(workspace.root, "extractions", extractionId);
  fs.mkdirSync(bundle, { recursive: true });
  const records = clientReadRecordsFixture(extractionId);
  writeJson(path.join(bundle, CLIENT_READ_RECORDS_FILE), records);
  writeJson(path.join(bundle, "originals.json"), []);
  writeJson(path.join(bundle, "validation.json"), { passed: true, datasetId: extractionId });
  writeAssembly(bundle, assemble(records, []));
  await publishManifest(bundle, {
    ...stage,
    result: { ...stage.result, failures: [] },
    kind: "extraction",
    id: extractionId,
    inputs: await stageInputs(environment, await readManifest(environment, "environment")),
    outputs: await inventory(bundle),
  });
});

afterEach(() => fs.rmSync(workspace.root, { recursive: true, force: true }));

test("同一提取结果重复打包时复验并复用封存，安装后的资源字节与包内一致", async () => {
  const installed = path.join(workspace.root, "installed");
  const before = await inventory(installed);
  const id = await buildResourcePackage(extractionId);
  const directory = path.join(workspace.root, "resource-packages", id);
  const sealed = await inventory(directory);
  expect(await buildResourcePackage(extractionId)).toBe(id);
  expect(await inventory(directory)).toEqual(sealed);
  expect(await inventory(installed)).toEqual(before);
  const manifest = await verifyResourcePackage(id);
  expect(manifest.inputs.files.map((file) => file.path)).toContain(CLIENT_READ_RECORDS_FILE);
  expect(manifest.outputs.map((file) => file.path)).toContain(IMAGE_PROCESSING_REPORT_FILE);
  await installLocalResources(id);
  expect((await inventory(installed)).filter(({ path }) => path !== ".gitkeep")).toEqual(
    await inventory(path.join(directory, WEBSITE_RESOURCE_DIRECTORY)),
  );
  expect(fs.readFileSync(path.join(installed, ".gitkeep"), "utf8")).toBe("placeholder");
});

test("资源包拒绝上游清单变化与多余文件，并隔离损坏目录后重建", async () => {
  const id = await buildResourcePackage(extractionId);
  const directory = path.join(workspace.root, "resource-packages", id);
  const environment = path.join(workspace.root, "environments", environmentId);
  const file = path.join(environment, stageManifestFile("environment"));
  const original = fs.readFileSync(file);
  const manifest = await readManifest(environment, "environment");
  await publishManifest(environment, { ...manifest, createdAt: "2026-10-27T00:00:00.000Z" });
  await expect(verifyResourcePackage(id)).rejects.toThrow(
    "input inventory does not match environment",
  );
  fs.writeFileSync(file, original);
  fs.writeFileSync(path.join(directory, "unrelated.json"), "{}");
  await expect(verifyResourcePackage(id)).rejects.toThrow("Sealed resource package file set");
  expect(await buildResourcePackage(extractionId)).toBe(id);
  expect((await verifyResourcePackage(id)).id).toBe(id);
  expect(
    fs.readdirSync(path.dirname(directory)).some((name) => name.startsWith(`${id}.corrupt-`)),
  ).toBe(true);
});
