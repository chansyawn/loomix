import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { WEBSITE_RESOURCE_MANIFEST_FILE } from "@loomix/schema/website-resources";
import { downloadRelease, immutableCacheControl, sha256 } from "../src/release.ts";
import { writeFixture, writeDocuments, imageKey, remoteImageKey } from "./fixture.ts";
import { material } from "../../../packages/schema/tests/fixture.ts";

const directories: string[] = [];
const base = "https://assets.loomix.fun/releases/r1/";
const storageLayout = "shared-images-v1" as const;
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
    for (const file of [
      WEBSITE_RESOURCE_MANIFEST_FILE,
      ...release.manifest.files.map((file) => file.path),
    ])
      files.set(file, await readFile(path.join(directory, file)));
    files.set(remoteImageKey, await readFile(path.join(directory, imageKey)));
    files.set(
      "_complete.json",
      Buffer.from(
        JSON.stringify({
          release: "r1",
          manifestSha256: sha256(files.get(WEBSITE_RESOURCE_MANIFEST_FILE)!),
          storageLayout,
        }),
      ),
    );
  };
  await load();
  const request: typeof fetch = (input) => {
    const pathname = new URL(input instanceof Request ? input.url : String(input)).pathname;
    const name = pathname.startsWith("/images/")
      ? pathname.slice(1)
      : pathname.slice("/releases/r1/".length);
    const bytes = files.get(name);
    return Promise.resolve(
      new Response(bytes ? new Uint8Array(bytes) : "missing", {
        status: bytes ? 200 : 404,
        headers: {
          "access-control-allow-origin": "https://loomix.fun",
          ...(name === "_complete.json" ? { "cache-control": "no-store" } : {}),
          ...(name === remoteImageKey
            ? { "content-type": "image/webp", "cache-control": immutableCacheControl }
            : {}),
        },
      }),
    );
  };
  return { ...release, directory, files, load, request };
}

test("downloads and validates every document declared by the immutable release", async () => {
  const { request, dataset } = await fixture();
  expect((await downloadRelease(base, request)).dataset).toEqual(dataset);
});
test("远程完成标记必须绑定本次上传的 ID 和清单哈希", async () => {
  const { request, files } = await fixture();
  const marker = {
    release: "r1",
    manifestSha256: sha256(files.get(WEBSITE_RESOURCE_MANIFEST_FILE)!),
    storageLayout,
  };
  await expect(downloadRelease(base, request, "https://loomix.fun", marker)).resolves.toBeDefined();
  for (const expected of [
    { ...marker, manifestSha256: "a".repeat(64) },
    { ...marker, release: "other" },
  ])
    await expect(downloadRelease(base, request, "https://loomix.fun", expected)).rejects.toThrow(
      "expected completion marker",
    );
});
test.each([
  WEBSITE_RESOURCE_MANIFEST_FILE,
  "zh-CN/catalog.json",
  "zh-CN/gameplay-tags.json",
  "zh-CN/neighbors.json",
  "image-index.json",
])("rejects changed bytes in %s", async (file) => {
  const { files, request } = await fixture();
  files.set(file, Buffer.concat([files.get(file)!, Buffer.from("\n")]));
  await expect(downloadRelease(base, request)).rejects.toThrow(/SHA-256/);
});
test("rejects missing documents and incorrect release identity", async () => {
  const { files, request } = await fixture();
  files.delete("image-index.json");
  await expect(downloadRelease(base, request)).rejects.toThrow("HTTP 404");
  files.set(
    "_complete.json",
    Buffer.from(JSON.stringify({ release: "r2", manifestSha256: "a".repeat(64), storageLayout })),
  );
  await expect(downloadRelease(base, request)).rejects.toThrow("does not match");
});
test("验证公共域名上的共享图片，缺失或字节不正确时失败", async () => {
  const { files, request } = await fixture();
  files.delete(remoteImageKey);
  await expect(downloadRelease(base, request)).rejects.toThrow(
    `/${remoteImageKey} returned HTTP 404`,
  );
  files.set(remoteImageKey, Buffer.from("wrong"));
  await expect(downloadRelease(base, request)).rejects.toThrow("Public image verification failed");
});

test("拒绝 CDN 缓存命中的完成标记", async () => {
  const { request } = await fixture();
  const cachedMarker: typeof fetch = async (input, init) => {
    const response = await request(input, init);
    response.headers.set("cf-cache-status", "HIT");
    return response;
  };
  await expect(downloadRelease(base, cachedMarker)).rejects.toThrow("must bypass caches");
});
test("checks cross-document references even when all byte hashes match", async () => {
  const fixtureData = await fixture();
  fixtureData.dataset.catalog.items[0] = { ...material(1), tagIds: [999] };
  await writeDocuments(fixtureData.directory, fixtureData.dataset, fixtureData.imageIndex);
  await fixtureData.load();
  await expect(downloadRelease(base, fixtureData.request)).rejects.toThrow("Unknown tag 999");
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

test("checks every resource against the requested Preview origin", async () => {
  const { request, dataset } = await fixture();
  const origin = "https://pr-3-loomix-website.chansyawn.workers.dev";
  const previewRequest: typeof fetch = async (input, init) => {
    expect(new Headers(init?.headers).get("Origin")).toBe(origin);
    const response = await request(input, init);
    response.headers.set("access-control-allow-origin", origin);
    return response;
  };
  expect((await downloadRelease(base, previewRequest, origin)).dataset).toEqual(dataset);
  await expect(downloadRelease(base, request, origin)).rejects.toThrow("CORS");
});

test("accepts resources with wildcard CORS access", async () => {
  const { request } = await fixture();
  const wildcardRequest: typeof fetch = async (input, init) => {
    const response = await request(input, init);
    response.headers.set("access-control-allow-origin", "*");
    return response;
  };
  await expect(
    downloadRelease(base, wildcardRequest, "https://pr-3-loomix-website.chansyawn.workers.dev"),
  ).resolves.toBeDefined();
});
