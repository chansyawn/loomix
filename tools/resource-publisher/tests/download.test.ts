import { expect, test } from "vite-plus/test";
import { emptyCatalog } from "@loomix/content-schema";
import { downloadRelease, sha256 } from "../src/release.ts";

const base = "https://assets.loomix.fun/releases/r1/";
const json = JSON.stringify(
  emptyCatalog({ gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 }),
);
const neighborsJson = JSON.stringify({
  schemaVersion: 1,
  source: {
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
    manifestId: "5662883",
  },
  neighbors: [],
  stars: [],
  stories: [],
  travelReactions: [],
  encounterIslands: [],
  friendshipRules: [],
  eventTags: [],
  furnishingThemes: [],
  rewards: [],
  assets: [],
});
const neighborImagesJson = JSON.stringify({
  schemaVersion: 1,
  source: JSON.parse(neighborsJson).source,
  images: [],
});
const marker = {
  release: "r1",
  contentSha256: sha256(Buffer.from(json)),
  neighborsSha256: sha256(Buffer.from(neighborsJson)),
  neighborImagesSha256: sha256(Buffer.from(neighborImagesJson)),
  assetCount: 0,
  neighborCount: 0,
};

function resourceServer(
  options: {
    marker?: unknown;
    json?: string;
    neighborsJson?: string;
    neighborImagesJson?: string;
    cors?: string;
    status?: number;
  } = {},
): typeof fetch {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = url.endsWith("neighbor-images.json")
      ? (options.neighborImagesJson ?? neighborImagesJson)
      : url.endsWith("_complete.json")
        ? JSON.stringify(options.marker ?? marker)
        : url.endsWith("neighbors.json")
          ? (options.neighborsJson ?? neighborsJson)
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

test("CI requires matching neighbor JSON, count, and source metadata", async () => {
  await expect(
    downloadRelease(base, resourceServer({ neighborsJson: `${neighborsJson}\n` })),
  ).rejects.toThrow("Neighbor JSON SHA-256");
  await expect(
    downloadRelease(base, resourceServer({ marker: { ...marker, neighborCount: 1 } })),
  ).rejects.toThrow("neighbor count");
  const mismatched = JSON.parse(neighborsJson);
  mismatched.source.resourceRevision++;
  const body = JSON.stringify(mismatched);
  await expect(
    downloadRelease(
      base,
      resourceServer({
        neighborsJson: body,
        marker: { ...marker, neighborsSha256: sha256(Buffer.from(body)) },
      }),
    ),
  ).rejects.toThrow("source does not match");
});

test("CI rejects missing image markers and mismatched image mappings", async () => {
  const { neighborImagesSha256: _missing, ...legacyMarker } = marker;
  await expect(downloadRelease(base, resourceServer({ marker: legacyMarker }))).rejects.toThrow();
  await expect(
    downloadRelease(base, resourceServer({ neighborImagesJson: `${neighborImagesJson}\n` })),
  ).rejects.toThrow("Neighbor images SHA-256");
  const mapping = JSON.parse(neighborImagesJson);
  mapping.source.manifestId = "123";
  const body = JSON.stringify(mapping);
  await expect(
    downloadRelease(
      base,
      resourceServer({
        neighborImagesJson: body,
        marker: { ...marker, neighborImagesSha256: sha256(Buffer.from(body)) },
      }),
    ),
  ).rejects.toThrow("source does not match");
});
