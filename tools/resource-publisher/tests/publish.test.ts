import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { emptyCatalog } from "@loomix/content-schema";
import { publishRelease } from "../src/publish.ts";
import type { UploadProgress } from "../src/publish.ts";
import { parseReleaseBase, sha256 } from "../src/release.ts";
import { createR2Store } from "../src/store.ts";
import type { ReleaseStore } from "../src/store.ts";
import { validateContent } from "../src/validate.ts";

const directories: string[] = [];
const webp = Buffer.from(
  "UklGRuYAAABXRUJQVlA4WAoAAAAQAAAA/wAA/wAAQUxQSBIAAAABB1DAiAgAKNL//xTR/9T//gNWUDggrgAAADARAJ0BKgABAAE+bTaZSaQjIqEgKACADYlpbuF2sR7cAAAWlsnIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32rAAP7/XGb//ztbDEFS//+tt383sqAAAAAAAAAAAA==",
  "base64",
);
const imageKey = `assets/${sha256(webp)}.webp`;

async function fixture(imageCount = 1): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-publisher-"));
  directories.push(directory);
  const content = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  const neighbors = {
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
  };
  await mkdir(path.join(directory, "assets"));
  for (let i = 0; i < imageCount; i++) {
    const chunk = Buffer.alloc(8 + i * 2);
    chunk.write("JUNK");
    chunk.writeUInt32LE(i * 2, 4);
    const bytes = i === 0 ? webp : Buffer.concat([webp, chunk]);
    if (i) bytes.writeUInt32LE(bytes.length - 8, 4);
    const image = `assets/${sha256(bytes)}.webp`;
    content.items.push({
      category: "miscellaneous",
      kind: "item",
      subcategory: null,
      attributes: {},
      encyclopediaEntry: null,
      id: i + 1,
      name: "Image",
      description: null,
      quality: 0,
      image,
    });
    await writeFile(path.join(directory, image), bytes);
  }
  await writeFile(path.join(directory, "content.json"), JSON.stringify(content));
  await writeFile(path.join(directory, "neighbors.json"), JSON.stringify(neighbors));
  return directory;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function memoryStore(failKey?: string): { store: ReleaseStore; objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    store: {
      async tryReserve(key, bytes) {
        if (key === failKey) throw new Error(`Write rejected: ${key}`);
        if (objects.has(key)) return false;
        objects.set(key, bytes);
        return true;
      },
      async put(key, bytes, contentType) {
        if (key.endsWith(".webp")) expect(contentType).toBe("image/webp");
        if (key === failKey || objects.has(key)) throw new Error(`Write rejected: ${key}`);
        objects.set(key, bytes);
      },
      async verify(key, size, hash) {
        const bytes = objects.get(key);
        if (!bytes || bytes.length !== size || sha256(bytes) !== hash)
          throw new Error("Verification failed");
      },
    },
  };
}

test("publishes a complete, verifiable release and refuses to overwrite it", async () => {
  const directory = await fixture();
  const { store, objects } = memoryStore();
  const marker = await publishRelease(directory, "0.95.2-r1", store);
  expect(marker).toEqual({
    release: "0.95.2-r1",
    assetCount: 1,
    contentSha256: sha256(await readFile(path.join(directory, "content.json"))),
    neighborsSha256: sha256(await readFile(path.join(directory, "neighbors.json"))),
    neighborCount: 0,
  });
  expect([...objects.keys()]).toEqual([
    "releases/0.95.2-r1/_upload.json",
    `releases/0.95.2-r1/${imageKey}`,
    "releases/0.95.2-r1/content.json",
    "releases/0.95.2-r1/neighbors.json",
    "releases/0.95.2-r1/_complete.json",
  ]);
  await expect(publishRelease(directory, "0.95.2-r1", store)).rejects.toThrow(
    "Release already exists",
  );
});

test("an interrupted upload cannot produce a completion marker or reuse its release ID", async () => {
  const directory = await fixture();
  const { store, objects } = memoryStore(`releases/r1/${imageKey}`);
  await expect(publishRelease(directory, "r1", store)).rejects.toThrow("Write rejected");
  expect(objects.has("releases/r1/_complete.json")).toBe(false);
  await expect(publishRelease(directory, "r1", store)).rejects.toThrow("Release already exists");
});

test("a reservation storage error is not reported as an existing release", async () => {
  const directory = await fixture();
  const { store } = memoryStore("releases/r1/_upload.json");
  await expect(publishRelease(directory, "r1", store)).rejects.toThrow("Write rejected");
});

test.each([
  { name: "PreconditionFailed", status: undefined, reserved: false },
  { name: "S3ServiceException", status: 412, reserved: false },
  { name: "ConditionalRequestConflict", status: 409, reserved: false },
  { name: "AccessDenied", status: 403, reserved: true },
  { name: "NetworkingError", status: undefined, reserved: true },
])(
  "R2 reservation maps only conditional conflicts to existing objects: $name",
  async (testCase) => {
    const error = new Error(testCase.name);
    error.name = testCase.name;
    if (testCase.status !== undefined) {
      Object.assign(error, { $metadata: { httpStatusCode: testCase.status } });
    }
    vi.spyOn(S3Client.prototype, "send").mockRejectedValue(error);
    const store = createR2Store("a".repeat(32), "bucket", "key", "secret");
    const reservation = store.tryReserve(
      "releases/r1/_upload.json",
      Buffer.from("{}"),
      "application/json",
      "hash",
    );

    if (testCase.reserved) {
      await expect(reservation).rejects.toBe(error);
    } else {
      await expect(reservation).resolves.toBe(false);
    }
  },
);

test("concurrent publishers cannot mix content under the same release", async () => {
  const directory = await fixture();
  const { store } = memoryStore();
  const results = await Promise.allSettled([
    publishRelease(directory, "r1", store),
    publishRelease(directory, "r1", store),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((result) => result.status === "rejected");
  expect(rejected?.status).toBe("rejected");
  if (rejected?.status === "rejected") {
    expect(rejected.reason).toMatchObject({
      message: "Release already exists: r1. Use a new release ID.",
    });
  }
});

test("a failed remote integrity check prevents completion", async () => {
  const directory = await fixture();
  const { store, objects } = memoryStore();
  store.verify = async () => {
    throw new Error("Remote integrity mismatch");
  };
  await expect(publishRelease(directory, "r1", store)).rejects.toThrow("Remote integrity mismatch");
  expect(objects.has("releases/r1/_complete.json")).toBe(false);
});

test("rejects missing, extra, corrupt, and invalidly referenced assets before publication", async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, imageKey), Buffer.from("corrupt"));
  await expect(validateContent(directory)).rejects.toThrow("SHA-256 mismatch");
  await rm(path.join(directory, imageKey));
  await expect(validateContent(directory)).rejects.toThrow("exactly the images referenced");
  await writeFile(path.join(directory, imageKey), webp);
  await writeFile(path.join(directory, "assets/extra.webp"), webp);
  await expect(validateContent(directory)).rejects.toThrow("exactly the images referenced");
  await rm(path.join(directory, "assets/extra.webp"));
  await writeFile(path.join(directory, "content.json"), "{}");
  await expect(validateContent(directory)).rejects.toThrow();
});

test("rejects a neighbor database from a different client revision", async () => {
  const directory = await fixture();
  const neighbors = JSON.parse(await readFile(path.join(directory, "neighbors.json"), "utf8"));
  neighbors.source.dataRevision++;
  await writeFile(path.join(directory, "neighbors.json"), JSON.stringify(neighbors));
  await expect(validateContent(directory)).rejects.toThrow("source does not match");
});

test("rejects a non-WebP or truncated container even when its content hash matches", async () => {
  for (const bytes of [Buffer.from("not a WebP image"), webp.subarray(0, webp.length - 2)]) {
    const directory = await fixture();
    const key = `assets/${sha256(bytes)}.webp`;
    const content = emptyCatalog({
      gameVersion: "0.95.2",
      dataRevision: 1449213,
      resourceRevision: 1391927,
    });
    content.items.push({
      category: "miscellaneous",
      kind: "item",
      subcategory: null,
      attributes: {},
      encyclopediaEntry: null,
      id: 1,
      name: "Invalid",
      description: null,
      quality: 0,
      image: key,
    });
    await rm(path.join(directory, imageKey));
    await writeFile(path.join(directory, key), bytes);
    await writeFile(path.join(directory, "content.json"), JSON.stringify(content));
    await expect(validateContent(directory)).rejects.toThrow("Invalid WebP container");
  }
});

test.each(["../escape", "r1/path", "", ".", ".."])(
  "rejects unsafe release ID %s",
  async (release) => {
    await expect(publishRelease("unused", release, memoryStore().store)).rejects.toThrow();
  },
);

test("requires an immutable HTTPS release base", () => {
  expect(parseReleaseBase("https://assets.loomix.fun/releases/0.95.2-r1/").pathname).toBe(
    "/releases/0.95.2-r1/",
  );
  for (const value of [
    "http://assets.loomix.fun/releases/r1/",
    "https://assets.loomix.fun/latest/",
    "https://assets.loomix.fun/releases/r1/?q=1",
  ]) {
    expect(() => parseReleaseBase(value)).toThrow();
  }
});

test("allows a regular directory placeholder without publishing it", async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, ".gitkeep"), "");
  const content = await validateContent(directory);
  expect(content.assets.map((asset) => asset.key)).toEqual([imageKey]);
  const { store, objects } = memoryStore();
  await publishRelease(directory, "placeholder", store);
  expect([...objects.keys()].some((key) => key.endsWith(".gitkeep"))).toBe(false);
  await rm(path.join(directory, ".gitkeep"));
  await mkdir(path.join(directory, ".gitkeep"));
  await expect(validateContent(directory)).rejects.toThrow("regular file");
});

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("progress counts remotely verified images and bytes in concurrent completion order", async () => {
  const directory = await fixture(3);
  const content = await validateContent(directory);
  const { store } = memoryStore();
  const verify = store.verify.bind(store);
  const gate = deferred();
  const otherImages = deferred();
  const updates: UploadProgress[] = [];
  const held = content.assets[0];
  store.verify = async (key, size, hash) => {
    await verify(key, size, hash);
    if (key.endsWith(held.key)) await gate.promise;
  };
  const publication = publishRelease(directory, "progress", store, (progress) => {
    updates.push(progress);
    if (progress.completed === 2) otherImages.resolve();
  });
  try {
    await otherImages.promise;
    expect(updates.map((p) => p.completed)).toEqual([0, 1, 2]);
    expect(updates.at(-1)?.completedBytes).toBe(
      content.assets.slice(1).reduce((sum, a) => sum + a.size, 0),
    );
  } finally {
    gate.resolve();
    await publication;
  }
  expect(updates.map((p) => p.phase)).toEqual([
    "images",
    "images",
    "images",
    "images",
    "finalizing",
    "complete",
  ]);
  expect(updates.at(-1)).toEqual({
    phase: "complete",
    completed: 3,
    total: 3,
    completedBytes: content.assets.reduce((sum, a) => sum + a.size, 0),
    totalBytes: content.assets.reduce((sum, a) => sum + a.size, 0),
  });
});

test("a failed upload suppresses progress from in-flight images and never completes", async () => {
  const directory = await fixture(2);
  const content = await validateContent(directory);
  const { store, objects } = memoryStore();
  const verify = store.verify.bind(store);
  const ready = deferred();
  const gate = deferred();
  const late = deferred();
  const updates: UploadProgress[] = [];
  store.verify = async (key, size, hash) => {
    await verify(key, size, hash);
    if (key.endsWith(content.assets[0].key)) {
      await ready.promise;
      throw new Error("Image verification failed");
    }
    ready.resolve();
    await gate.promise;
    late.resolve();
  };
  try {
    await expect(
      publishRelease(directory, "failed", store, (p) => updates.push(p)),
    ).rejects.toThrow("Image verification failed");
  } finally {
    gate.resolve();
    await late.promise;
  }
  expect(updates).toHaveLength(1);
  expect(updates[0].completed).toBe(0);
  expect(objects.has("releases/failed/_complete.json")).toBe(false);
});

test("zero-image versions report finalization and completion without invalid totals", async () => {
  const updates: UploadProgress[] = [];
  await publishRelease(await fixture(0), "empty", memoryStore().store, (p) => updates.push(p));
  expect(updates.map((p) => p.phase)).toEqual(["images", "finalizing", "complete"]);
  expect(
    updates.every(
      (p) => p.total === 0 && p.completed === 0 && p.totalBytes === 0 && p.completedBytes === 0,
    ),
  ).toBe(true);
});

test("failure to verify the completion marker never reports successful publication", async () => {
  const directory = await fixture();
  const { store } = memoryStore();
  const verify = store.verify.bind(store);
  const updates: UploadProgress[] = [];
  store.verify = async (key, size, hash) => {
    if (key.endsWith("/_complete.json")) throw new Error("Completion verification failed");
    await verify(key, size, hash);
  };
  await expect(publishRelease(directory, "marker", store, (p) => updates.push(p))).rejects.toThrow(
    "Completion verification failed",
  );
  expect(updates.at(-1)?.phase).toBe("finalizing");
});
