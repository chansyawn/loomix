import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, expect, test } from "vite-plus/test";
import { islandImagePaths, parseIslandDatabase, parseIslandImages } from "@loomix/island-schema";
import { publishRelease } from "../src/publish.ts";
import { sha256 } from "../src/release.ts";
import { validateContent } from "../src/validate.ts";
import type { ReleaseStore } from "../src/store.ts";

const directories: string[] = [];
const source = { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" };

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-island-publication-"));
  directories.push(directory);
  await mkdir(path.join(directory, "assets"));
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } })
    .webp()
    .toBuffer();
  const image = `assets/${sha256(bytes)}.webp`;
  const database = parseIslandDatabase({
    schemaVersion: 1,
    source,
    islands: [
      {
        id: 1,
        nameZh: "岛屿",
        sceneId: 710000001,
        status: "default",
        galaxyId: null,
        regionId: null,
        iconStyleId: 1,
        illustrationPath: "UISprite/Card",
        displayCreatureIds: [],
        displaySpecialtyIds: [],
      },
    ],
    islandIconStyles: [
      {
        id: 1,
        nameZh: "鱼",
        iconPath: "UISprite/Icon",
        variantIconPath: "UISprite/Icon_b",
        entityPrefabPath: "Entity/Island.prefab",
      },
    ],
    regions: [],
  });
  const mapping = parseIslandImages({
    schemaVersion: 1,
    source,
    images: islandImagePaths(database).map((path) => ({ path, image })),
  });
  const files = {
    "content.json": {
      schemaVersion: 5,
      source: {
        gameVersion: source.gameVersion,
        dataRevision: source.dataRevision,
        resourceRevision: source.resourceRevision,
      },
      ingredientCategories: [],
      items: [],
      cropSeeds: [],
      details: [],
    },
    "neighbors.json": {
      schemaVersion: 1,
      source,
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
    },
    "neighbor-images.json": { schemaVersion: 1, source, images: [] },
    "islands.json": database,
    "islands-images.json": mapping,
  };
  for (const [file, value] of Object.entries(files))
    await writeFile(path.join(directory, file), JSON.stringify(value));
  await writeFile(path.join(directory, image), bytes);
  return { directory, database, mapping, image };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("validates island-only images, deduplicates references and rejects newly unreferenced assets", async () => {
  const { directory, mapping, image } = await fixture();
  const result = await validateContent(directory);
  expect(result.islandCount).toBe(1);
  expect(result.assets.map((asset) => asset.key)).toEqual([image]);
  expect(result.islandsSha256).toBe(sha256(await readFile(path.join(directory, "islands.json"))));
  for (const entry of mapping.images) entry.image = null;
  await writeFile(path.join(directory, "islands-images.json"), JSON.stringify(mapping));
  await expect(validateContent(directory)).rejects.toThrow("exactly the images referenced");
  await rm(path.join(directory, image));
  expect((await validateContent(directory)).assets).toEqual([]);
});

test("image mappings must exactly cover all referenced island paths", async () => {
  const { directory, mapping } = await fixture();
  for (const images of [
    mapping.images.slice(1),
    [...mapping.images, { path: "unused", image: null }],
  ]) {
    await writeFile(
      path.join(directory, "islands-images.json"),
      JSON.stringify({ ...mapping, images }),
    );
    await expect(validateContent(directory)).rejects.toThrow("exactly the referenced paths");
  }
});

test.each(["islands.json", "islands-images.json"])(
  "publication requires a regular %s",
  async (file) => {
    const { directory } = await fixture();
    await rm(path.join(directory, file));
    await expect(validateContent(directory)).rejects.toThrow(file);
    await mkdir(path.join(directory, file));
    await expect(validateContent(directory)).rejects.toThrow("regular file");
  },
);

test("both island sources must match the catalog and the neighbor manifest", async () => {
  const { directory, database, mapping } = await fixture();
  for (const key of ["gameVersion", "dataRevision", "resourceRevision", "manifestId"] as const) {
    const changed = structuredClone(database);
    Object.assign(changed.source, { [key]: typeof source[key] === "string" ? "other" : 2 });
    await writeFile(path.join(directory, "islands.json"), JSON.stringify(changed));
    await expect(validateContent(directory)).rejects.toThrow(
      key === "manifestId" ? "manifest does not match" : "source does not match",
    );
  }
  await writeFile(path.join(directory, "islands.json"), JSON.stringify(database));
  mapping.source.manifestId = "other";
  await writeFile(path.join(directory, "islands-images.json"), JSON.stringify(mapping));
  await expect(validateContent(directory)).rejects.toThrow("source does not match");
});

test("island-only asset bytes must match their content hash", async () => {
  const { directory, image } = await fixture();
  await writeFile(path.join(directory, image), "corrupt");
  await expect(validateContent(directory)).rejects.toThrow("SHA-256 mismatch");
});

test.each(["islands.json", "islands-images.json"])(
  "failed upload of %s cannot complete a release",
  async (file) => {
    const { directory } = await fixture();
    const objects = new Map<string, Uint8Array>();
    const store: ReleaseStore = {
      async tryReserve(key, bytes) {
        objects.set(key, bytes);
        return true;
      },
      async put(key, bytes) {
        if (key === `releases/test/${file}`) throw new Error("Interrupted island upload");
        objects.set(key, bytes);
      },
      async verify(key, size, hash) {
        const bytes = objects.get(key);
        if (!bytes || bytes.length !== size || sha256(bytes) !== hash)
          throw new Error("Remote hash mismatch");
      },
    };
    await expect(publishRelease(directory, "test", store)).rejects.toThrow(
      "Interrupted island upload",
    );
    expect(objects.has("releases/test/_complete.json")).toBe(false);
  },
);
