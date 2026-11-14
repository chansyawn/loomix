import { expect, test } from "vite-plus/test";
import { emptyDataset } from "../src/dataset/index.ts";
import { parseNeighbors, StoryLayoutSchema } from "../src/neighbors/index.ts";

function documentWithParagraph(paragraph: unknown) {
  const { neighbors } = emptyDataset(
    { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
    { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
  );
  return {
    ...neighbors,
    stories: [{ key: "11:1", neighborId: 11, chapter: 1, title: "故事", paragraphs: [paragraph] }],
  };
}

test.each(StoryLayoutSchema.options)(
  "preserves %s even when image delivery is missing",
  (layout) => {
    const paragraph = {
      sequence: 1,
      layout,
      text: ["text", "image-left", "image-right"].includes(layout) ? "正文" : null,
      image: null,
    };
    expect(parseNeighbors(documentWithParagraph(paragraph)).stories[0]!.paragraphs[0]).toEqual(
      paragraph,
    );
  },
);

test.each([
  { layout: "text", text: null, image: null },
  { layout: "text", text: "正文", image: { assetId: "story", variant: "illustration" } },
  { layout: "image-left", text: null, image: null },
  { layout: "image-right", text: null, image: null },
  { layout: "image", text: "正文", image: null },
  { layout: "portrait-image", text: "正文", image: null },
  { layout: "unknown", text: "正文", image: null },
  { text: "正文", image: null },
])("rejects contradictory or missing story layouts: %j", (paragraph) => {
  expect(() => parseNeighbors(documentWithParagraph({ sequence: 1, ...paragraph }))).toThrow();
});
