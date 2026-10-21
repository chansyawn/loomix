import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { emptyContent } from "@loomix/content-schema";
import { publishRelease } from "../src/publish.ts";
import { parseReleaseBase, sha256 } from "../src/release.ts";
import type { ReleaseStore } from "../src/store.ts";
import { validateContent } from "../src/validate.ts";

const directories: string[] = [];
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSAAAAABJRU5ErkJggg==",
  "base64",
);
const imageKey = `assets/${sha256(png)}.png`;

async function fixture(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-publisher-"));
  directories.push(directory);
  const content = emptyContent();
  content.miscellaneous.push({
    id: 1,
    name: "Image",
    description: null,
    quality: 0,
    image: imageKey,
  });
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, imageKey), png);
  await writeFile(path.join(directory, "content.json"), JSON.stringify(content));
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function memoryStore(failKey?: string): { store: ReleaseStore; objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    store: {
      async hasObjects(prefix) {
        return [...objects.keys()].some((key) => key.startsWith(prefix));
      },
      async put(key, bytes) {
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
  });
  expect([...objects.keys()]).toEqual([
    "releases/0.95.2-r1/_upload.json",
    `releases/0.95.2-r1/${imageKey}`,
    "releases/0.95.2-r1/content.json",
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

test("concurrent publishers cannot mix content under the same release", async () => {
  const directory = await fixture();
  const { store } = memoryStore();
  const results = await Promise.allSettled([
    publishRelease(directory, "r1", store),
    publishRelease(directory, "r1", store),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
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
  await writeFile(path.join(directory, imageKey), png);
  await writeFile(path.join(directory, "assets/extra.png"), png);
  await expect(validateContent(directory)).rejects.toThrow("exactly the images referenced");
  await rm(path.join(directory, "assets/extra.png"));
  await writeFile(path.join(directory, "content.json"), "{}");
  await expect(validateContent(directory)).rejects.toThrow();
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
