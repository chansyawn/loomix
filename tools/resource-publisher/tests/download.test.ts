import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { downloadRelease, sha256 } from "../src/release.ts";
import { writeFixture, writeDocuments } from "./fixture.ts";

const directories: string[] = [];
const base = "https://assets.loomix.fun/releases/r1/";
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-download-"));
  directories.push(directory);
  const release = await writeFixture(directory);
  const files = new Map<string, Buffer>();
  const load = async () => {
    for (const file of ["release.json", ...release.manifest.files.map((file) => file.path)])
      files.set(file, await readFile(path.join(directory, file)));
    files.set(
      "_complete.json",
      Buffer.from(
        JSON.stringify({ release: "r1", manifestSha256: sha256(files.get("release.json")!) }),
      ),
    );
  };
  await load();
  const request: typeof fetch = (input) => {
    const name = new URL(input instanceof Request ? input.url : String(input)).pathname.slice(
      "/releases/r1/".length,
    );
    const bytes = files.get(name);
    return Promise.resolve(
      new Response(bytes ? new Uint8Array(bytes) : "missing", {
        status: bytes ? 200 : 404,
        headers: { "access-control-allow-origin": "https://loomix.fun" },
      }),
    );
  };
  return { ...release, directory, files, load, request };
}

test("downloads and validates every document declared by the immutable release", async () => {
  const { request, dataset } = await fixture();
  expect((await downloadRelease(base, request)).dataset).toEqual(dataset);
});
test.each([
  "release.json",
  "zh-CN/catalog.json",
  "zh-CN/neighbors.json",
  "zh-CN/world.json",
  "assets.json",
])("rejects changed bytes in %s", async (file) => {
  const { files, request } = await fixture();
  files.set(file, Buffer.concat([files.get(file)!, Buffer.from("\n")]));
  await expect(downloadRelease(base, request)).rejects.toThrow(/SHA-256/);
});
test("rejects missing documents and incorrect release identity", async () => {
  const { files, request } = await fixture();
  files.delete("assets.json");
  await expect(downloadRelease(base, request)).rejects.toThrow("HTTP 404");
  files.set(
    "_complete.json",
    Buffer.from(JSON.stringify({ release: "r2", manifestSha256: "a".repeat(64) })),
  );
  await expect(downloadRelease(base, request)).rejects.toThrow("does not match");
});
test("checks cross-document context even when all byte hashes match", async () => {
  const fixtureData = await fixture();
  fixtureData.dataset.world.snapshotId = "b".repeat(64);
  await writeDocuments(fixtureData.directory, fixtureData.dataset, fixtureData.assets);
  await fixtureData.load();
  await expect(downloadRelease(base, fixtureData.request)).rejects.toThrow("context mismatch");
});
test("rejects resources without website CORS access", async () => {
  const { request } = await fixture();
  const withoutCors: typeof fetch = async (input, init) => {
    const response = await request(input, init);
    response.headers.delete("access-control-allow-origin");
    return response;
  };
  await expect(downloadRelease(base, withoutCors)).rejects.toThrow("CORS");
});
