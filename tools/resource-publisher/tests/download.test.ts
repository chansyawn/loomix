import { expect, test, vi } from "vite-plus/test";
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
const islandsJson = JSON.stringify({
  schemaVersion: 1,
  source: JSON.parse(neighborsJson).source,
  islands: [],
  islandIconStyles: [],
  regions: [],
});
const islandsImagesJson = JSON.stringify({
  schemaVersion: 1,
  source: JSON.parse(neighborsJson).source,
  images: [],
});
const marker = {
  release: "r1",
  contentSha256: sha256(Buffer.from(json)),
  neighborsSha256: sha256(Buffer.from(neighborsJson)),
  neighborImagesSha256: sha256(Buffer.from(neighborImagesJson)),
  islandsSha256: sha256(Buffer.from(islandsJson)),
  islandsImagesSha256: sha256(Buffer.from(islandsImagesJson)),
  assetCount: 0,
  neighborCount: 0,
  islandCount: 0,
};

function resourceServer(
  options: {
    marker?: unknown;
    json?: string;
    neighborsJson?: string;
    neighborImagesJson?: string;
    islandsJson?: string;
    islandsImagesJson?: string;
    cors?: string;
    status?: number;
    missing?: string;
  } = {},
): typeof fetch {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = url.endsWith("islands-images.json")
      ? (options.islandsImagesJson ?? islandsImagesJson)
      : url.endsWith("islands.json")
        ? (options.islandsJson ?? islandsJson)
        : url.endsWith("neighbor-images.json")
          ? (options.neighborImagesJson ?? neighborImagesJson)
          : url.endsWith("_complete.json")
            ? JSON.stringify(options.marker ?? marker)
            : url.endsWith("neighbors.json")
              ? (options.neighborsJson ?? neighborsJson)
              : (options.json ?? json);
    return new Response(body, {
      status: url.endsWith(options.missing ?? "never-missing") ? 404 : (options.status ?? 200),
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

test.each(["islands.json", "islands-images.json"])(
  "CI requires %s in island releases",
  async (missing) => {
    await expect(downloadRelease(base, resourceServer({ missing }))).rejects.toThrow("HTTP 404");
  },
);

test("CI verifies both island file hashes and the island count", async () => {
  await expect(
    downloadRelease(base, resourceServer({ islandsJson: `${islandsJson}\n` })),
  ).rejects.toThrow("Island JSON SHA-256");
  await expect(
    downloadRelease(base, resourceServer({ islandsImagesJson: `${islandsImagesJson}\n` })),
  ).rejects.toThrow("Island images SHA-256");
  await expect(
    downloadRelease(base, resourceServer({ marker: { ...marker, islandCount: 1 } })),
  ).rejects.toThrow("island count");
});

test("CI verifies island source metadata even for hash-valid JSON", async () => {
  for (const field of ["gameVersion", "dataRevision", "resourceRevision", "manifestId"]) {
    const data = JSON.parse(islandsJson);
    data.source[field] = typeof data.source[field] === "number" ? 99 : "other";
    const body = JSON.stringify(data);
    await expect(
      downloadRelease(
        base,
        resourceServer({
          islandsJson: body,
          marker: { ...marker, islandsSha256: sha256(Buffer.from(body)) },
        }),
      ),
    ).rejects.toThrow(field === "manifestId" ? "manifest does not match" : "source does not match");
  }
  const mapping = JSON.parse(islandsImagesJson);
  mapping.source.manifestId = "other";
  const body = JSON.stringify(mapping);
  await expect(
    downloadRelease(
      base,
      resourceServer({
        islandsImagesJson: body,
        marker: { ...marker, islandsImagesSha256: sha256(Buffer.from(body)) },
      }),
    ),
  ).rejects.toThrow("source does not match");
});

test("legacy releases remain readable but partial island markers are rejected", async () => {
  const {
    islandsSha256: _islands,
    islandsImagesSha256: _images,
    islandCount: _count,
    ...legacy
  } = marker;
  const request = vi.fn(resourceServer({ marker: legacy }));
  expect((await downloadRelease(base, request)).toString()).toBe(json);
  expect(request.mock.calls).toHaveLength(4);
  for (const field of ["islandsSha256", "islandsImagesSha256", "islandCount"] as const)
    await expect(
      downloadRelease(base, resourceServer({ marker: { ...legacy, [field]: marker[field] } })),
    ).rejects.toThrow("metadata must be complete");
});

test("island image references contribute to the deduplicated release asset count", async () => {
  const data = {
    ...JSON.parse(islandsJson),
    regions: [
      {
        id: 1,
        galaxyId: 1,
        layerId: 1,
        nameZh: "区域",
        sceneId: 1001,
        sdfPath: "UISprite/Map",
        stationImagePath: "UISprite/Station",
      },
    ],
  };
  const image = `assets/${"a".repeat(64)}.webp`;
  const mapping = {
    ...JSON.parse(islandsImagesJson),
    images: [
      { path: "UISprite/Map", image },
      { path: "UISprite/Station", image },
    ],
  };
  const islandBody = JSON.stringify(data);
  const imageBody = JSON.stringify(mapping);
  const options = {
    islandsJson: islandBody,
    islandsImagesJson: imageBody,
    marker: {
      ...marker,
      islandsSha256: sha256(Buffer.from(islandBody)),
      islandsImagesSha256: sha256(Buffer.from(imageBody)),
      assetCount: 1,
    },
  };
  expect((await downloadRelease(base, resourceServer(options))).toString()).toBe(json);
  await expect(
    downloadRelease(
      base,
      resourceServer({ ...options, marker: { ...options.marker, assetCount: 2 } }),
    ),
  ).rejects.toThrow("image count");
  mapping.images = [];
  const missing = JSON.stringify(mapping);
  await expect(
    downloadRelease(
      base,
      resourceServer({
        ...options,
        islandsImagesJson: missing,
        marker: { ...options.marker, islandsImagesSha256: sha256(Buffer.from(missing)) },
      }),
    ),
  ).rejects.toThrow("exactly the referenced paths");
});
