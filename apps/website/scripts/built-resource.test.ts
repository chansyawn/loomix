import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { WEBSITE_RESOURCE_MANIFEST_FILE } from "@loomix/schema/website-resources";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { sha256 } from "../../../tools/resources/src/release.ts";
import { writeFixture } from "../../../tools/resources/tests/fixture.ts";
import { builtResourceFile, verifyBuiltResource } from "./built-resource.ts";

const resourceBaseUrl = "https://assets.example.com/releases/current/";
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-built-resource-"));
  directories.push(directory);
  const file = pathToFileURL(path.join(directory, builtResourceFile));
  await writeFile(file, JSON.stringify({ resourceBaseUrl }));
  await writeFixture(directory, 0);
  const manifestBytes = await readFile(
    path.join(directory, WEBSITE_RESOURCE_MANIFEST_FILE),
    "utf8",
  );
  return { file, manifestBytes };
}

function remote(manifest: string, manifestSha256 = sha256(Buffer.from(manifest))) {
  const marker = { release: "current", manifestSha256, storageLayout: "shared-images-v1" };
  const request = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const headers = { "access-control-allow-origin": "https://loomix.fun" };
    if (url.pathname === "/releases/current/_complete.json") {
      return Response.json(marker, { headers: { ...headers, "cache-control": "no-store" } });
    }
    if (url.pathname === `/releases/current/${WEBSITE_RESOURCE_MANIFEST_FILE}`) {
      return new Response(manifest, { headers });
    }
    throw new Error(`Unexpected request: ${url.href}`);
  });
  return { request, marker };
}

test("部署前核对构建地址及完成标记绑定的网站资源清单", async () => {
  const { file, manifestBytes } = await fixture();
  const { request, marker } = remote(manifestBytes);
  await expect(verifyBuiltResource(request, file, resourceBaseUrl)).resolves.toEqual({
    resourceBaseUrl,
    marker,
  });
  expect(request).toHaveBeenCalledTimes(2);
});

test("构建绑定的地址不匹配时不请求远程资源", async () => {
  const { file } = await fixture();
  const request = vi.fn<typeof fetch>();
  await expect(
    verifyBuiltResource(request, file, "https://assets.example.com/releases/expected/"),
  ).rejects.toThrow("URL mismatch");
  expect(request).not.toHaveBeenCalled();
});

test("拒绝清单哈希不符的构建资源", async () => {
  const { file, manifestBytes } = await fixture();
  const { request } = remote(manifestBytes, "a".repeat(64));
  await expect(verifyBuiltResource(request, file, resourceBaseUrl)).rejects.toThrow(
    "manifest SHA-256 mismatch",
  );
});

test("完成标记哈希正确时仍拒绝旧格式清单", async () => {
  const { file, manifestBytes } = await fixture();
  const manifest = JSON.parse(manifestBytes);
  const { request } = remote(
    JSON.stringify({ ...manifest, formatVersion: manifest.formatVersion - 1 }),
  );
  await expect(verifyBuiltResource(request, file, resourceBaseUrl)).rejects.toThrow(
    "formatVersion",
  );
});
