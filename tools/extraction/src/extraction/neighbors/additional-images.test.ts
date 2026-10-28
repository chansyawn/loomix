import { expect, test } from "vite-plus/test";
import type { AdditionalNeighborImageCategory } from "@loomix/schema/extraction/neighbor";
import type { IndexedAsset } from "../types.ts";
import {
  additionalNeighborImageSelections,
  selectAdditionalNeighborImages,
} from "./additional-images.ts";

const selections = additionalNeighborImageSelections();

test("keeps only the approved friend-image categories in the extraction manifest", () => {
  const counts: Partial<Record<AdditionalNeighborImageCategory, number>> = {};
  for (const selection of selections)
    counts[selection.category] = (counts[selection.category] ?? 0) + 1;
  expect(selections).toHaveLength(115);
  expect(counts).toEqual({
    avatar: 12,
    card: 50,
    favour: 11,
    house: 12,
    island: 10,
    outline: 8,
    role: 12,
  });
});

test("selects by the exact frozen asset identity and rejects changed index entries", () => {
  const indexed = selections.map((selection): IndexedAsset => ({
    Name: selection.resourceName,
    Container: selection.container,
    Type: selection.assetType,
    Source: selection.source,
    PathID: selection.pathId,
  }));
  const textures = indexed.filter((asset) => asset.Type === "Texture2D");
  const sprites = indexed.filter((asset) => asset.Type === "Sprite");
  const selected = selectAdditionalNeighborImages(textures, sprites);
  expect(selected).toHaveLength(115);
  expect(selected.map((asset) => asset.resourceName)).toEqual(
    selections.map((selection) => selection.resourceName),
  );

  const changed = textures.map((asset) => ({
    ...asset,
    Container:
      asset.Name === selections[0]!.resourceName ? "unexpected/container.png" : asset.Container,
  }));
  expect(() => selectAdditionalNeighborImages(changed, sprites)).toThrow(
    "Additional neighbor image index identity changed",
  );
});
