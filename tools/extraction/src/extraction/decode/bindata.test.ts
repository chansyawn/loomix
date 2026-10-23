import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { parseBinData } from "./bindata.ts";

test("BinData preserves missing localized references and ignores unrelated client fields", () => {
  const result = parseBinData(
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
    {
      CHabitat_Flowers: { textContent: { textId: "TagDisplayName_Habitat_Flowers" } },
      Missing: { textContent: null },
    },
  );
  assert.equal(result.tree[1].TagName, "家具");
  assert.equal(result.tagDisplay[1].nameInGame, null);
  assert.equal(result.tagDisplay[2].nameInGame?.textId, "TagDisplayName_Tool");
  assert.equal(result.display.Missing.textContent, null);
});

test("malformed BinData stops before content construction", () => {
  assert.throws(() => parseBinData({ AllNodes: { 1: { TagId: "1" } } }, { TagUIData: {} }, {}));
  assert.throws(() => parseBinData({ AllNodes: {} }, {}, {}), /Missing TagUIData/);
});
