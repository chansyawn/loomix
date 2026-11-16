import { expect, test } from "vite-plus/test";
import { StoryLayoutSchema, StoryParagraphSchema } from "../src/neighbors/index.ts";

test.each(StoryLayoutSchema.options)(
  "preserves %s even when image delivery is missing",
  (layout) => {
    const paragraph = {
      layout,
      text: ["text", "image-left", "image-right"].includes(layout) ? "正文" : null,
      image: null,
    };
    expect(StoryParagraphSchema.parse(paragraph)).toEqual(paragraph);
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
  expect(() => StoryParagraphSchema.parse(paragraph)).toThrow();
});
