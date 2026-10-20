import { expect, test } from "vite-plus/test";
import { emptyContent } from "@petit-orbit/content-schema";
import { downloadRelease, sha256 } from "../src/release.ts";

const base = "https://assets.loomix.fun/releases/r1/";
const json = JSON.stringify(emptyContent());
const marker = { release: "r1", contentSha256: sha256(Buffer.from(json)), assetCount: 0 };

function resourceServer(
  options: {
    marker?: unknown;
    json?: string;
    cors?: string;
    status?: number;
  } = {},
): typeof fetch {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = url.endsWith("_complete.json")
      ? JSON.stringify(options.marker ?? marker)
      : (options.json ?? json);
    return new Response(body, {
      status: options.status ?? 200,
      headers: { "access-control-allow-origin": options.cors ?? "*" },
    });
  };
}

test("CI receives only content matching the completed release", async () => {
  expect((await downloadRelease(base, resourceServer())).toString()).toBe(json);
});

test("CI stops for missing completion, incorrect CORS, and a different release marker", async () => {
  await expect(downloadRelease(base, resourceServer({ status: 404 }))).rejects.toThrow("HTTP 404");
  await expect(
    downloadRelease(base, resourceServer({ cors: "https://other.example" })),
  ).rejects.toThrow("CORS");
  await expect(
    downloadRelease(base, resourceServer({ marker: { ...marker, release: "r2" } })),
  ).rejects.toThrow("does not match the configured URL");
});

test("CI stops for tampered JSON, invalid content, and incorrect image counts", async () => {
  await expect(downloadRelease(base, resourceServer({ json: `${json}\n` }))).rejects.toThrow(
    "SHA-256",
  );
  await expect(
    downloadRelease(
      base,
      resourceServer({
        json: "{}",
        marker: { ...marker, contentSha256: sha256(Buffer.from("{}")) },
      }),
    ),
  ).rejects.toThrow();
  await expect(
    downloadRelease(base, resourceServer({ marker: { ...marker, assetCount: 1 } })),
  ).rejects.toThrow("image count");
});
