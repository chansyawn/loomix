import { expect, test } from "vite-plus/test";
import type { AdditionalNeighborImageCategory } from "./schema.ts";
import type { IndexedAsset } from "../types.ts";
import {
  additionalNeighborImageSelections,
  parseAdditionalNeighborImageSelections,
  selectAdditionalNeighborImages,
} from "./additional-images.ts";

const selections = additionalNeighborImageSelections();
const indexed = selections.map((selection): IndexedAsset => ({
  Name: selection.resourceName,
  Container: selection.container,
  Type: selection.assetType,
  Source: selection.source,
  PathID: selection.pathId,
}));
const textures = indexed.filter((asset) => asset.Type === "Texture2D");
const sprites = indexed.filter((asset) => asset.Type === "Sprite");

test("keeps only the approved friend-image categories in the extraction manifest", () => {
  const counts: Partial<Record<AdditionalNeighborImageCategory, number>> = {};
  for (const selection of selections)
    counts[selection.category] = (counts[selection.category] ?? 0) + 1;
  expect(selections).toHaveLength(132);
  expect(counts).toEqual({
    avatar: 12,
    favour: 11,
    house: 12,
    island: 10,
    outline: 8,
    role: 12,
    diaryIllustration: 11,
    diaryWatermark: 22,
    diarySticker: 22,
    starAtlasIcon: 12,
  });
});

test("keeps the confirmed diary coverage and only white star atlas symbols", () => {
  const diaryIds = [11, 12, 1008, 1009, 1010, 1011, 1013, 1015, 1017, 1018, 1019];
  for (const [category, perNeighbor] of [
    ["diaryIllustration", 1],
    ["diaryWatermark", 2],
    ["diarySticker", 2],
  ] as const) {
    const entries = selections.filter((selection) => selection.category === category);
    expect(entries.every((entry) => entry.npcId !== null)).toBe(true);
    expect([...new Set(entries.map((entry) => entry.npcId))].sort((a, b) => a! - b!)).toEqual(
      diaryIds,
    );
    for (const id of diaryIds)
      expect(entries.filter((entry) => entry.npcId === id)).toHaveLength(perNeighbor);
  }
  const atlas = selections.filter((selection) => selection.category === "starAtlasIcon");
  expect(atlas.every((entry) => entry.resourceName.startsWith("Img_Icon_StarAtlas_Lock_"))).toBe(
    true,
  );
  expect(atlas.map((entry) => entry.npcId).sort((a, b) => a! - b!)).toEqual([
    11, 12, 12, 1005, 1008, 1009, 1010, 1010, 1011, 1013, 1015, 1017,
  ]);
});

test("selects by the exact frozen asset identity", () => {
  const selected = selectAdditionalNeighborImages(textures, sprites);
  expect(selected).toHaveLength(132);
  expect(selected.map((asset) => asset.resourceName)).toEqual(
    selections.map((selection) => selection.resourceName),
  );
});

test.each(["Texture2D", "Sprite"] as const)(
  "rejects missing, duplicated and changed %s identities",
  (assetType) => {
    const source = assetType === "Texture2D" ? textures : sprites;
    const target = source[0]!;
    const select = (entries: IndexedAsset[]) =>
      assetType === "Texture2D"
        ? selectAdditionalNeighborImages(entries, sprites)
        : selectAdditionalNeighborImages(textures, entries);
    const error = "Additional neighbor image index identity changed";
    expect(() => select(source.slice(1))).toThrow(error);
    expect(() => select([...source, target])).toThrow(error);
    for (const field of ["Type", "Name", "Container", "Source", "PathID"] as const)
      expect(() => select([{ ...target, [field]: "changed" }, ...source.slice(1)])).toThrow(error);
  },
);

test("requires owners for the new categories and validates manifest identities and order", () => {
  for (const category of [
    "diaryIllustration",
    "diaryWatermark",
    "diarySticker",
    "starAtlasIcon",
  ] as const) {
    const entry = selections.find((selection) => selection.category === category)!;
    expect(() => parseAdditionalNeighborImageSelections([{ ...entry, npcId: null }])).toThrow(
      "Neighbor-specific images need a neighbor",
    );
    expect(() => parseAdditionalNeighborImageSelections([{ ...entry, npcId: 0 }])).toThrow();
  }
  expect(() => parseAdditionalNeighborImageSelections([selections[0], selections[0]])).toThrow(
    "Additional image resource names must be unique",
  );
  expect(() => parseAdditionalNeighborImageSelections([selections[1], selections[0]])).toThrow(
    "Additional image selections must be sorted by resource name",
  );
});

test("omits images assigned to excluded neighbors while retaining unassigned images", () => {
  expect(selections.some((selection) => selection.npcId === 1014)).toBe(false);
  expect(selections.some((selection) => selection.npcId === null)).toBe(true);
  const entry = selections[0]!;
  expect(parseAdditionalNeighborImageSelections([{ ...entry, npcId: 1014 }])).toEqual([]);
  expect(parseAdditionalNeighborImageSelections([{ ...entry, npcId: null }])).toEqual([
    { ...entry, npcId: null },
  ]);
});
