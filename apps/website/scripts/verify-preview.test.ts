import { expect, test, vi } from "vite-plus/test";
import { verifyPreview, retryPreview } from "./verify-preview.ts";

vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));

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
