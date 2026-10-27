import { expect, test } from "vite-plus/test";
import {
  IslandDatabaseSchema,
  IslandImagesSchema,
  isPublicIsland,
  islandImagePaths,
  validateIslandCatalog,
  validateIslandImages,
} from "./index.ts";

const source = { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" };
const database = {
  schemaVersion: 1 as const,
  source,
  islands: [
    {
      id: 1,
      nameZh: "岛屿",
      sceneId: 710000001,
      status: "default" as const,
      galaxyId: null,
      regionId: null,
      iconStyleId: 1,
      illustrationPath: null,
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
};

test("island schema rejects duplicate IDs, dangling icon styles, and unknown properties", () => {
  expect(IslandDatabaseSchema.safeParse(database).success).toBe(true);
  expect(IslandDatabaseSchema.safeParse({ ...database, root: 1 }).success).toBe(false);
  expect(
    IslandDatabaseSchema.safeParse({
      ...database,
      islands: [database.islands[0], database.islands[0]],
    }).success,
  ).toBe(false);
  expect(
    IslandDatabaseSchema.safeParse({
      ...database,
      islands: [{ ...database.islands[0], iconStyleId: 2 }],
    }).success,
  ).toBe(false);
});

test("image mapping requires exact sorted reference coverage", () => {
  const paths = islandImagePaths(database);
  const images = IslandImagesSchema.parse({
    schemaVersion: 1,
    source,
    images: paths.map((path) => ({ path, image: null })),
  });
  expect(() => validateIslandImages(database, images)).not.toThrow();
  expect(() => validateIslandImages(database, { ...images, images: [] })).toThrow();
});

test("only default and encounter islands are eligible for public display", () => {
  expect(isPublicIsland({ ...database.islands[0]!, status: "default" })).toBe(true);
  expect(isPublicIsland({ ...database.islands[0]!, status: "encounter" })).toBe(true);
  for (const status of ["test", "placeholder", "unconfirmed"] as const)
    expect(isPublicIsland({ ...database.islands[0]!, status })).toBe(false);
});

test("unknown nested fields, unsafe paths, dangling regions and unsorted IDs are rejected", () => {
  for (const island of [
    { ...database.islands[0], position: [0, 0] },
    { ...database.islands[0], regionId: 99 },
    { ...database.islands[0], illustrationPath: "../escape" },
    { ...database.islands[0], displayCreatureIds: [2, 1] },
    { ...database.islands[0], displaySpecialtyIds: [1, 1] },
  ])
    expect(IslandDatabaseSchema.safeParse({ ...database, islands: [island] }).success).toBe(false);
  expect(
    IslandImagesSchema.safeParse({ schemaVersion: 1, source, images: [], extra: true }).success,
  ).toBe(false);
  expect(
    IslandImagesSchema.safeParse({
      schemaVersion: 1,
      source,
      images: [{ path: "UISprite/Icon", image: null, extra: true }],
    }).success,
  ).toBe(false);
});

test("image mappings reject wrong sources and unreferenced or duplicate paths", () => {
  const images = IslandImagesSchema.parse({
    schemaVersion: 1,
    source,
    images: islandImagePaths(database).map((path) => ({ path, image: null })),
  });
  for (const key of ["gameVersion", "dataRevision", "resourceRevision", "manifestId"] as const) {
    const invalid = structuredClone(images);
    Object.assign(invalid.source, { [key]: typeof source[key] === "string" ? "other" : 2 });
    expect(() => validateIslandImages(database, invalid)).toThrow("source does not match");
  }
  expect(() =>
    validateIslandImages(database, {
      ...images,
      images: [...images.images, { path: "unused", image: null }],
    }),
  ).toThrow("exactly");
  expect(
    IslandImagesSchema.safeParse({ ...images, images: [images.images[0], images.images[0]] })
      .success,
  ).toBe(false);
});

test("catalog references must resolve to admitted creature and item records", () => {
  const linked = IslandDatabaseSchema.parse({
    ...database,
    islands: [{ ...database.islands[0], displayCreatureIds: [10], displaySpecialtyIds: [20] }],
  });
  const catalog = {
    source,
    items: [
      { id: 10, category: "creatures", kind: "item" },
      { id: 20, category: "plants", kind: "item" },
    ],
  };
  expect(() => validateIslandCatalog(linked, catalog)).not.toThrow();
  expect(() => validateIslandCatalog(linked, { ...catalog, items: [] })).toThrow("creature");
  expect(() =>
    validateIslandCatalog(linked, { ...catalog, items: catalog.items.slice(0, 1) }),
  ).toThrow("specialty");
  expect(() =>
    validateIslandCatalog(linked, { ...catalog, source: { ...source, gameVersion: "other" } }),
  ).toThrow("source does not match");
});
