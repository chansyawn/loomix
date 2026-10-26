import { expect, test } from "vite-plus/test";
import { parseNeighborImages, validateNeighborImages } from "@loomix/neighbor-schema";
import { loadNeighbors, toNeighborsView } from "./data";
import { neighborFixture } from "./fixture";
import { neighborsSearchSchema, queryNeighbors } from "./search";

const { database, mapping } = neighborFixture();
test("adapts relationships, nullable card IDs, repeated images and incomplete records", () => {
  const data = toNeighborsView(database, mapping);
  expect(data.neighbors.map((neighbor) => neighbor.name)).toEqual([
    "蛮蛮",
    "幻雪",
    "图塔",
    "纳蕾娜",
  ]);
  expect(data.neighbors[1]!.stories).toEqual([]);
  expect(data.neighbors[2]!.travel).toEqual([]);
  expect(data.neighbors[3]!.themes.map((theme) => theme.key)).toEqual(["theme:a", "theme:b"]);
  expect(data.neighbors[0]!.stories[1]!.paragraphs[0]).toMatchObject({
    text: null,
    hasIllustration: true,
  });
  expect(data.neighbors[0]!.travel[0]).toMatchObject({
    name: "友邻在旅行中获得物品",
    reactions: [{ text: "旅行真开心！", parameters: "阈值：4 · 资源类别：6 · 次级阈值：2" }],
  });
  expect(mapping.images).toHaveLength(2);
});

test("searches names and planets and intersects galaxy filters without reordering", () => {
  const data = toNeighborsView(database, mapping);
  const query = (search: unknown) =>
    queryNeighbors(data, neighborsSearchSchema.parse(search)).map((neighbor) => neighbor.name);
  expect(query({ q: "蛮蛮" })).toEqual(["蛮蛮"]);
  expect(query({ q: "星球", galaxy: "禾夏" })).toEqual(["蛮蛮", "幻雪"]);
  expect(query({ q: "蛮蛮", galaxy: "帕沙" })).toEqual([]);
  expect(query({ q: ["坏输入"], galaxy: "不存在" })).toHaveLength(4);
});

test("mapping requires sorted unique complete paths and the exact source", () => {
  expect(() =>
    parseNeighborImages({ ...mapping, images: [...mapping.images].reverse() }),
  ).toThrow();
  expect(() =>
    parseNeighborImages({ ...mapping, images: [mapping.images[0], mapping.images[0]] }),
  ).toThrow();
  expect(() => validateNeighborImages(database, { ...mapping, images: [] })).toThrow("exactly");
  expect(() =>
    validateNeighborImages(database, {
      ...mapping,
      source: { ...mapping.source, manifestId: "2" },
    }),
  ).toThrow("source");
  expect(() =>
    parseNeighborImages({ ...mapping, images: [{ path: "bad", image: "UISprite/Star.png" }] }),
  ).toThrow();
  expect(() =>
    validateNeighborImages(database, {
      ...mapping,
      images: mapping.images.map((entry) => ({ ...entry, image: null })),
    }),
  ).not.toThrow();
});

test("retains optional extra images without changing neighbor-page image mappings", () => {
  const expanded = parseNeighborImages({
    ...mapping,
    additionalImages: [
      {
        key: "NPCFavour_1015",
        category: "favour",
        npcId: 1015,
        image: `assets/${"a".repeat(64)}.webp`,
      },
    ],
  });
  validateNeighborImages(database, expanded);
  expect(toNeighborsView(database, expanded)).toEqual(toNeighborsView(database, mapping));
  expect(() =>
    parseNeighborImages({
      ...expanded,
      additionalImages: [...expanded.additionalImages!, ...expanded.additionalImages!],
    }),
  ).toThrow();
});

test("loads both resources and rejects HTTP, parsing, and version failures", async () => {
  const response = (value: unknown) => new Response(JSON.stringify(value));
  const request: typeof fetch = async (input) =>
    response(
      (typeof input === "string" ? input : input instanceof URL ? input.href : input.url).endsWith(
        "neighbor-images.json",
      )
        ? mapping
        : database,
    );
  await expect(loadNeighbors(request)).resolves.toHaveProperty("neighbors.length", 4);
  await expect(loadNeighbors(async () => new Response("missing", { status: 404 }))).rejects.toThrow(
    "resources",
  );
  await expect(loadNeighbors(async () => response({}))).rejects.toThrow();
  await expect(
    loadNeighbors(async (input) =>
      response(
        (typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url
        ).endsWith("neighbor-images.json")
          ? { ...mapping, source: { ...mapping.source, dataRevision: 1 } }
          : database,
      ),
    ),
  ).rejects.toThrow("source");
});
