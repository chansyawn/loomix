import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { parseTagBinData, parseCreatureDisplay } from "./bindata.ts";

test("BinData preserves missing localized references and ignores unrelated client fields", () => {
  const result = parseTagBinData(
    {
      AllNodes: {
        1: { TagId: 1, TagName: "家具", ParentId: 0, EnumName: "Furniture", Extra: true },
      },
    },
    {
      TagUIData: {
        1: { nameInGame: null },
        2: { nameInGame: { textId: "TagDisplayName_Tool", effects: [] } },
      },
    },
  );
  assert.equal(result.tree[1].TagName, "家具");
  assert.equal(result.tagDisplay[1].nameInGame, null);
  assert.equal(result.tagDisplay[2].nameInGame?.textId, "TagDisplayName_Tool");
  assert.equal(parseCreatureDisplay({ Missing: { textContent: null } }).Missing.textContent, null);
});

test("malformed BinData stops before content construction", () => {
  assert.throws(() => parseTagBinData({ AllNodes: { 1: { TagId: "1" } } }, { TagUIData: {} }));
  assert.throws(() => parseTagBinData({ AllNodes: {} }, {}), /Missing TagUIData/);
});
