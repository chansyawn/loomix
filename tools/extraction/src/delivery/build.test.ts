import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import fs from "node:fs";
import path from "node:path";
import { digest, inventory } from "../workflow/hashing.ts";
import { publishManifest, readManifest } from "../workflow/manifest.ts";
import { deliver } from "./build.ts";

const dependencies = vi.hoisted(() => ({
  root: `/tmp/loomix-artifact-delivery-${process.pid}-${Date.now()}`,
  publish: vi.fn(),
  safeOutput: vi.fn(),
  render: vi.fn(),
  collection: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("../paths.ts", async (original) => ({
  ...(await original<typeof import("../paths.ts")>()),
  websiteDirectory: `${dependencies.root}/website`,
  identityDirectory: (kind: string, id: string) => `${dependencies.root}/${kind}/${id}`,
}));
vi.mock("../workflow/identity.ts", () => ({
  profileHash: "a".repeat(64),
  implementationRevision: async () => "b".repeat(64),
}));
vi.mock("./images.ts", () => ({ renderImages: dependencies.render }));
vi.mock("./collection.ts", () => ({ renderCollection: dependencies.collection }));
vi.mock("./verify.ts", () => ({ verifyDelivery: dependencies.verify }));
vi.mock("./publish.ts", () => ({
  publish: dependencies.publish,
  safeOutput: dependencies.safeOutput,
}));

const extractionId = "c".repeat(64);
beforeEach(async () => {
  vi.clearAllMocks();
  fs.mkdirSync(path.join(dependencies.root, "website"), { recursive: true });
  fs.writeFileSync(
    path.join(dependencies.root, "website/content.json"),
    "existing website bytes\n",
  );
  const bundle = path.join(dependencies.root, "extractions", extractionId);
  fs.mkdirSync(path.join(bundle, "raw"), { recursive: true });
  for (const file of ["content.json", "neighbors.json", "images-content-v5.json"])
    fs.writeFileSync(path.join(bundle, "raw", file), "{}\n");
  const outputs = await inventory(bundle);
  await publishManifest(bundle, {
    schemaVersion: 1,
    kind: "extraction",
    id: extractionId,
    status: "verified",
    createdAt: "2026-10-26T00:00:00.000Z",
    inputs: { id: "environment", files: [], sha256: digest([]) },
    implementation: "b".repeat(64),
    profileHash: "a".repeat(64),
    tools: {},
    outputs,
    result: { passed: true, validation: "passed", failures: [] },
  });
  dependencies.render.mockImplementation(async ({ work }: { work: string }) => {
    fs.mkdirSync(path.join(work, "staging"), { recursive: true });
    fs.writeFileSync(path.join(work, "staging/content.json"), "generated artifact\n");
  });
  dependencies.collection.mockResolvedValue(undefined);
  dependencies.verify.mockResolvedValue(undefined);
});
afterEach(() => fs.rmSync(dependencies.root, { recursive: true, force: true }));

test("artifact-only delivery seals a verifiable bundle without accessing the website output", async () => {
  const before = await inventory(path.join(dependencies.root, "website"));
  const id = await deliver(extractionId, { artifactOnly: true });
  const directory = path.join(dependencies.root, "deliveries", id);
  const manifest = await readManifest(directory, "delivery");
  expect(manifest.deliveryMode).toBe("artifact-only");
  expect(fs.readFileSync(path.join(directory, "staging/content.json"), "utf8")).toBe(
    "generated artifact\n",
  );
  expect(dependencies.verify).toHaveBeenCalledOnce();
  expect(dependencies.collection).toHaveBeenCalledOnce();
  expect(dependencies.publish).not.toHaveBeenCalled();
  expect(dependencies.safeOutput).not.toHaveBeenCalled();
  expect(await inventory(path.join(dependencies.root, "website"))).toEqual(before);
});

test("v5 collection delivery can publish through the website target", async () => {
  const id = await deliver(extractionId);
  const directory = path.join(dependencies.root, "deliveries", id);
  const manifest = await readManifest(directory, "delivery");
  expect(manifest.deliveryMode).toBe("website");
  expect(dependencies.render).toHaveBeenCalledOnce();
  expect(dependencies.collection).toHaveBeenCalledOnce();
  expect(dependencies.verify).toHaveBeenCalledOnce();
  expect(dependencies.safeOutput).toHaveBeenCalledOnce();
  expect(dependencies.publish).toHaveBeenCalledOnce();
});
