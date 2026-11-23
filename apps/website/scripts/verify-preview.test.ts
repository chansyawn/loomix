import { expect, test, vi } from "vite-plus/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WEBSITE_RESOURCE_MANIFEST_FILE } from "@loomix/schema/website-resources";
import { sha256 } from "../../../tools/resources/src/release.ts";
import { writeFixture } from "../../../tools/resources/tests/fixture.ts";
import { verifyPreview, retryPreview } from "./verify-preview.ts";

vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));

const resourceBaseUrl = "https://assets.example.com/releases/current/";
const previewOrigin = "https://pr-42.preview.loomix.fun";

function previewResponse(pathname: string, base = resourceBaseUrl): Response {
  const headers = { "x-robots-tag": "noindex" };
  if (pathname === "/resource-version.json")
    return Response.json({ resourceBaseUrl: base }, { headers });
  const contentType = pathname === "/" ? "text/html" : "image/png";
  return new Response(null, { headers: { ...headers, "content-type": contentType } });
}

test.each(["http://example.com", "https://user@example.com"])(
  "rejects an invalid Preview URL before requesting it: %s",
  async (url) => {
    const request = vi.fn<typeof fetch>();
    await expect(
      verifyPreview(url, "https://assets.example.com/releases/r1/", request),
    ).rejects.toThrow("HTTPS without credentials");
    expect(request).not.toHaveBeenCalled();
  },
);

test.each(["/", "/logo.png"])("rejects an unavailable Preview endpoint %s", async (pathname) => {
  const request = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    return new Response(null, {
      status: url.pathname === pathname ? 503 : 200,
      headers: {
        "content-type": url.pathname === "/" ? "text/html" : "image/png",
        "x-robots-tag": "noindex",
      },
    });
  });
  await expect(
    verifyPreview(
      "https://pr-42.preview.loomix.fun",
      "https://assets.example.com/releases/r1/",
      request,
    ),
  ).rejects.toThrow(`Preview ${pathname} returned HTTP 503`);
});

test("rejects HTML fallback responses for a static asset", async () => {
  const request = vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response("fallback", {
        headers: { "content-type": "text/html", "x-robots-tag": "noindex" },
      }),
  );
  await expect(
    verifyPreview(
      "https://pr-42.preview.loomix.fun",
      "https://assets.example.com/releases/r1/",
      request,
    ),
  ).rejects.toThrow("Preview /logo.png must return image/png");
});

test.each(["/", "/logo.png"])("requires noindex on %s", async (pathname) => {
  const request = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const headers = new Headers({
      "content-type": url.pathname === "/" ? "text/html" : "image/png",
    });
    if (url.pathname !== pathname) headers.set("x-robots-tag", "noindex");
    return new Response(null, { headers });
  });
  await expect(
    verifyPreview(
      "https://pr-42.preview.loomix.fun",
      "https://assets.example.com/releases/r1/",
      request,
    ),
  ).rejects.toThrow(`Preview ${pathname} is missing noindex`);
});

test("rejects other domains before requesting them", async () => {
  const request = vi.fn<typeof fetch>();
  await expect(
    verifyPreview("https://loomix.fun", "https://assets.example.com/releases/r1/", request),
  ).rejects.toThrow("preview.loomix.fun domain");
  expect(request).not.toHaveBeenCalled();
});

test("预览实际提供的资源地址不匹配时拒绝部署结果", async () => {
  const request = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    expect(url.origin).toBe(previewOrigin);
    return previewResponse(url.pathname, "https://assets.example.com/releases/stale/");
  });
  await expect(verifyPreview(previewOrigin, resourceBaseUrl, request)).rejects.toThrow(
    "URL mismatch",
  );
  expect(request).toHaveBeenCalledTimes(3);
});

test("预览实际绑定复用部署前的完成标记并以预览来源下载资源", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-preview-resources-"));
  try {
    const { manifest } = await writeFixture(directory, 0);
    const manifestBytes = await readFile(path.join(directory, WEBSITE_RESOURCE_MANIFEST_FILE));
    const marker = {
      release: "current",
      manifestSha256: sha256(manifestBytes),
      storageLayout: "shared-images-v1",
    } as const;
    const request = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.origin === previewOrigin) return previewResponse(url.pathname);
      expect(new Headers(init?.headers).get("Origin")).toBe(previewOrigin);
      const headers = { "access-control-allow-origin": previewOrigin };
      const filename = url.pathname.slice("/releases/current/".length);
      if (filename === "_complete.json") {
        return Response.json(marker, { headers: { ...headers, "cache-control": "no-store" } });
      }
      return new Response(new Uint8Array(await readFile(path.join(directory, filename))), {
        headers,
      });
    });
    await expect(
      verifyPreview(previewOrigin, resourceBaseUrl, request, marker),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3 + 2 + manifest.files.length);
    await expect(
      verifyPreview(previewOrigin, resourceBaseUrl, request, {
        ...marker,
        manifestSha256: "a".repeat(64),
      }),
    ).rejects.toThrow("expected completion marker");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("retries a temporary failure and returns after recovery", async () => {
  const check = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValue(undefined);
  await retryPreview(check);
  expect(check).toHaveBeenCalledTimes(2);
});

test("reports a persistent failure after three attempts", async () => {
  const check = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("persistent failure"));
  await expect(retryPreview(check)).rejects.toThrow("persistent failure");
  expect(check).toHaveBeenCalledTimes(3);
});
