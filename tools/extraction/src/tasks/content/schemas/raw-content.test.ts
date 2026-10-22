import { test } from "vite-plus/test";
import assert from "node:assert/strict";
import { emptyContent, parseContent } from "@loomix/content-schema";
import { parseRawContent } from "./raw-content.ts";
import { validateModel } from "../model.ts";

test("raw PNG references retain shared field and member constraints without weakening delivery schema", () => {
  const content = emptyContent();
  content.miscellaneous.push({
    id: 1,
    name: "fixture",
    image: `exports/${"a".repeat(24)}/Sprite/icon.png`,
    description: null,
    quality: 0,
  });
  assert.equal(parseRawContent(content).miscellaneous[0].image, content.miscellaneous[0].image);
  assert.equal(validateModel(content, [1], null, new Set([0]), parseRawContent).all.length, 1);
  assert.throws(() => parseContent(content));
  content.miscellaneous[0].image = "../outside.png";
  assert.throws(() => parseRawContent(content));
  content.miscellaneous[0].image = null;
  Object.assign(content.miscellaneous[0], { extra: "not allowed" });
  assert.throws(() => parseRawContent(content));
});

test("raw schema preserves shared cross-group membership refinements", () => {
  const content = emptyContent();
  content.miscellaneous.push({
    id: 1,
    name: "fixture",
    image: null,
    description: null,
    quality: 0,
  });
  content.furniture.sets.push({
    id: 2,
    name: "set",
    image: null,
    description: null,
    quality: 0,
    seriesName: null,
    componentIds: [1],
  });
  assert.throws(() => parseRawContent(content), /Member 1 must exist in furniture.items/);
});
