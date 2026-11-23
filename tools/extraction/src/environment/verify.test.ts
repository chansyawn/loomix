import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, vi } from "vite-plus/test";
import { importClient, resolveClientSnapshot } from "../client/snapshot.ts";
import { profile } from "../profile.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { writeJson } from "../workflow/json.ts";
import { publishManifest, STAGE_MANIFEST_VERSION } from "../workflow/manifest.ts";
import { verifyEnvironment } from "./verify.ts";

test("环境复验固定读取已绑定的客户端快照", async (testContext) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-verify-environment-"));
  vi.stubEnv("LOOMIX_DATA_ROOT", root);
  testContext.onTestFinished(() => {
    vi.unstubAllEnvs();
    const makeWritable = (directory: string) => {
      fs.chmodSync(directory, 0o755);
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) makeWritable(path.join(directory, entry.name));
      }
    };
    makeWritable(root);
    fs.rmSync(root, { recursive: true });
  });
  const source = path.join(root, "source");
  const game = path.join(source, profile.paths.gameRoot);
  const versions = path.join(game, "Persistent/versions", profile.manifestId);
  fs.mkdirSync(versions, { recursive: true });
  fs.writeFileSync(
    path.join(source, profile.paths.clientIni),
    `game_version=${profile.gameVersion}\n`,
  );
  writeJson(path.join(versions, "data_revision.json"), {
    branch: profile.branch,
    revision: profile.dataRevision,
  });
  writeJson(path.join(versions, "res_revision.json"), { revision: profile.resourceRevision });
  const files = ["ed.obb", "cs.obb"].map((file) => {
    fs.writeFileSync(path.join(game, file), file);
    return { path: file, matchesManifest: true, sha256: digest(file) };
  });
  const bound = await importClient(source, profile.paths);
  const id = digest("environment");
  const directory = path.join(root, id);
  fs.mkdirSync(directory);
  writeJson(path.join(directory, "config-source.json"), {
    dataRevision: profile.dataRevision,
    branch: profile.branch,
    files,
  });
  writeJson(path.join(directory, "asset-map-audit.json"), {
    assets: 2,
    indexed: 2,
    baseSources: 1,
    persistentSources: 1,
  });
  writeJson(path.join(directory, "asset-index.json"), [{}]);
  writeJson(path.join(directory, "resource-manifest-audit.json"), {
    passed: true,
    manifests: [{ manifest: "fixture", checked: 1 }],
  });
  await publishManifest(directory, {
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    kind: "environment",
    id,
    clientSnapshotId: bound.id,
    inputs: { id: bound.id, sha256: bound.id, files: [...bound.files] },
    implementation: digest("implementation"),
    profileHash: digest("profile"),
    status: "verified",
    createdAt: new Date().toISOString(),
    tools: {},
    outputs: await inventory(directory),
    result: { passed: true, validation: "passed", failures: [] },
  });
  fs.writeFileSync(path.join(game, "ed.obb"), "different client bytes");
  const other = await importClient(source, profile.paths);
  assert.equal((await verifyEnvironment(directory)).clientSnapshotId, bound.id);
  fs.renameSync(bound.directory, path.join(path.dirname(bound.directory), "removed-snapshot"));
  assert.equal(resolveClientSnapshot(profile).snapshot.id, other.id);
  await assert.rejects(
    verifyEnvironment(directory),
    new RegExp(`Missing client snapshot: ${bound.id}`),
  );
});
