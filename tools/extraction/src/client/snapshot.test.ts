import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import {
  assertClientUnchanged,
  clientRoot,
  importClient,
  resolveClientPath,
  selectClient,
  selectedSnapshotId,
  snapshotClient,
} from "./snapshot.ts";
import { STAGE_MANIFEST_VERSION } from "../workflow/manifest.ts";
import type { StageManifest } from "../workflow/manifest.ts";
import { digest } from "../workflow/hashing.ts";

function restoreWriteAccess(root: string): void {
  for (const name of fs.readdirSync(root)) {
    const file = path.join(root, name);
    if (fs.lstatSync(file).isDirectory()) restoreWriteAccess(file);
    else fs.chmodSync(file, 0o644);
  }
  fs.chmodSync(root, 0o755);
}

test("client snapshots are content-addressed, selected explicitly, and immutable", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-client-snapshot-"));
  const previous = process.env.LOOMIX_DATA_ROOT;
  process.env.LOOMIX_DATA_ROOT = path.join(root, "shared");
  const source = path.join(root, "source");
  fs.mkdirSync(path.join(source, "PetitPlanet_Data"), { recursive: true });
  fs.writeFileSync(path.join(source, "config.ini"), "version=1\n");
  fs.writeFileSync(path.join(source, "PetitPlanet_Data", "client.bin"), "first snapshot");
  t.onTestFinished(() => {
    if (previous === undefined) delete process.env.LOOMIX_DATA_ROOT;
    else process.env.LOOMIX_DATA_ROOT = previous;
    const shared = path.join(root, "shared");
    if (fs.existsSync(shared)) restoreWriteAccess(shared);
    fs.rmSync(root, { recursive: true, force: true });
  });

  const first = await importClient(source);
  await selectClient(first);
  assert.equal(selectedSnapshotId(), first);
  assert.equal(await snapshotClient().then((snapshot) => snapshot.sha256), first);
  assert.equal(
    fs.readFileSync(resolveClientPath("resources/game-client/PetitPlanet_Data/client.bin"), "utf8"),
    "first snapshot",
  );
  assert.throws(
    () => resolveClientPath("resources/game-client/../../outside"),
    /escapes its snapshot/,
  );
  assert.equal(fs.statSync(path.join(clientRoot(first), "config.ini")).mode & 0o222, 0);

  fs.writeFileSync(path.join(source, "PetitPlanet_Data", "client.bin"), "second snapshot");
  const second = await importClient(source);
  assert.notEqual(second, first);
  assert.equal(selectedSnapshotId(), first);
  const snapshot = await snapshotClient(clientRoot(first));
  const environment = {
    schemaVersion: STAGE_MANIFEST_VERSION,
    kind: "environment",
    id: digest("environment"),
    clientSnapshotId: first,
    status: "verified",
    createdAt: new Date().toISOString(),
    inputs: { id: first, ...snapshot },
    implementation: digest("implementation"),
    profileHash: digest("profile"),
    tools: {},
    outputs: snapshot.files,
    result: { passed: true, validation: "passed", failures: [] },
  } satisfies StageManifest<"environment">;
  await selectClient(second);
  assert.equal(selectedSnapshotId(), second);
  await assertClientUnchanged(environment);
  await assert.rejects(
    assertClientUnchanged({ ...environment, clientSnapshotId: second }),
    /Client snapshot changed/,
  );
});
