import { expect, test } from "vite-plus/test";
import { emptyDataset, parseDataset } from "../src/dataset/index.ts";
import { referencedImages } from "../src/dataset/images.ts";
import { parseNeighbors } from "../src/neighbors/index.ts";

const categories = [
  "diaryIllustration",
  "diaryWatermark",
  "diarySticker",
  "starAtlasIcon",
] as const;

function datasetWithImages() {
  const dataset = emptyDataset(
    { formatVersion: 7, snapshotId: "a".repeat(64), locale: "zh-CN" },
    { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
  );
  dataset.neighbors.neighbors.push({
    id: 11,
    name: "蛮蛮",
    bodyType: null,
    scaleValue: null,
    avatar: null,
    npc2Path: "Avatar/NPC2/NPC_11",
  });
  dataset.neighbors.additionalImages = categories.map((category) => ({
    key: `resource-${category}`,
    category,
    neighborId: 11,
    image: { assetId: category, variant: "illustration" },
  }));
  return dataset;
}

test("new neighbor image categories preserve their image references and resource identities", () => {
  const dataset = datasetWithImages();
  expect(parseDataset(dataset)).toEqual(dataset);
  const references = referencedImages(dataset);
  expect(references).toHaveLength(categories.length);
  expect(references).toEqual(
    expect.arrayContaining(dataset.neighbors.additionalImages.map((entry) => entry.image)),
  );
});

test.each(categories)("%s requires an owner and only references existing neighbors", (category) => {
  const dataset = datasetWithImages();
  const entry = dataset.neighbors.additionalImages.find((image) => image.category === category)!;
  for (const neighborId of [null, 0, -1, 1.5])
    expect(() =>
      parseNeighbors({
        ...dataset.neighbors,
        additionalImages: [{ ...entry, neighborId }],
      }),
    ).toThrow();
  entry.neighborId = 999;
  expect(() => parseDataset(dataset)).toThrow("Unknown neighbor 999");
});

test("new images keep the existing duplicate-key validation", () => {
  const dataset = datasetWithImages();
  dataset.neighbors.additionalImages.push({ ...dataset.neighbors.additionalImages[0]! });
  expect(() => parseDataset(dataset)).toThrow("Duplicate identity resource-diaryIllustration");
});

test("existing image categories still allow unassigned shared images", () => {
  const dataset = datasetWithImages();
  const image = dataset.neighbors.additionalImages[0]!.image;
  dataset.neighbors.additionalImages = (
    ["avatar", "card", "favour", "house", "island", "outline", "role"] as const
  ).map((category) => ({ key: category, category, neighborId: null, image }));
  expect(parseDataset(dataset)).toEqual(dataset);
});
