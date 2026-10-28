import { test } from "vite-plus/test";
import assert from "node:assert/strict";
import { emptyCatalog, parseCatalog } from "@loomix/schema/extraction";
import { parseRawContent } from "./raw-content.ts";
import { validateModel } from "../content/model.ts";

test("raw PNG references retain shared field and member constraints without weakening delivery schema", () => {
  const content = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  content.items.push({
    category: "miscellaneous",
    kind: "item",
    subcategory: null,
    attributes: {},
    encyclopediaEntry: null,
    id: 1,
    name: "fixture",
    image: `exports/${"a".repeat(24)}/Sprite/icon.png`,
    description: null,
    quality: 0,
  });
  assert.equal(parseRawContent(content).items[0].image, content.items[0].image);
  assert.equal(validateModel(content, [1], null, new Set([0]), parseRawContent).all.length, 1);
  assert.throws(() => parseCatalog(content));
  content.items[0].image = "../outside.png";
  assert.throws(() => parseRawContent(content));
  content.items[0].image = null;
  Object.assign(content.items[0], { extra: "not allowed" });
  assert.throws(() => parseRawContent(content));
});

test("raw schema preserves shared cross-group membership refinements", () => {
  const content = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  content.items.push({
    category: "miscellaneous",
    kind: "item",
    subcategory: null,
    attributes: {},
    encyclopediaEntry: null,
    id: 1,
    name: "fixture",
    image: null,
    description: null,
    quality: 0,
  });
  content.items.push({
    category: "furniture",
    kind: "set",
    encyclopediaEntry: { listed: true },
    id: 2,
    name: "set",
    image: null,
    description: null,
    quality: 0,
    memberIds: [1],
  });
  assert.throws(() => parseRawContent(content), /Member 1 must be an item in furniture/);
});
