import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TestContext } from "vite-plus/test";
import { test } from "vite-plus/test";
import type { AssetMapAsset } from "./asset-map.ts";
import { inspectAssetMap, readAssetMap } from "./asset-map.ts";
import { verifyAssetMap } from "../stages/init/asset-map.ts";

function fixture(t: TestContext, xml: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-map-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "asset-map.xml");
  fs.writeFileSync(file, xml);
  return file;
}
async function collect(file: string): Promise<AssetMapAsset[]> {
  const records: AssetMapAsset[] = [];
  for await (const asset of readAssetMap(file)) records.push(asset);
  return records;
}
const asset = (source: string): string =>
  `<Asset><Type id="28">Texture2D</Type><PathID>-9223372036854775808</PathID><Source>${source}</Source></Asset>`;

test("Asset Map is independent of line formatting and decodes entities exactly once", async (t) => {
  const file = fixture(
    t,
    `\uFEFF<?xml version="1.0"?><Assets>
    <Asset><Name>A &amp;lt; &#x4E2D; &quot;B&quot;</Name><Container/>
      <Type id="28">Texture2D</Type><PathID>9223372036854775807</PathID>
      <Source><![CDATA[/game/StreamingAssets/a&b.blk]]></Source></Asset>
    ${asset("C:\\game\\Persistent\\a.blk")}</Assets>`,
  );
  const records = await collect(file);
  assert.deepEqual(records[0], {
    Name: 'A &lt; 中 "B"',
    Type: "Texture2D",
    PathID: "9223372036854775807",
    Source: "/game/StreamingAssets/a&b.blk",
  });
  assert.equal(records[1].PathID, "-9223372036854775808");
  assert.deepEqual(await verifyAssetMap(file), { assets: 2, baseSources: 1, persistentSources: 1 });
});

test("Asset Map preserves text across stream chunk boundaries", async (t) => {
  const name = "图".repeat(24000);
  const file = fixture(
    t,
    `<Assets><Asset><Name>${name}</Name><Type>Sprite</Type><PathID>1</PathID><Source>a.blk</Source></Asset></Assets>`,
  );
  const records = await collect(file);
  assert.equal(records[0].Name, name);
});

test("malformed, incomplete and ambiguous Asset Maps are rejected", async (t) => {
  for (const xml of [
    "<Assets><Asset>",
    "<Other/>",
    "<Assets/><Assets/>",
    "<Assets><Asset><Type>Sprite</Type></Asset></Assets>",
    `<Assets>${asset("a.blk").replace("</Asset>", "<PathID>2</PathID></Asset>")}</Assets>`,
    `<Assets>${asset("a&unknown;.blk")}</Assets>`,
    `<!DOCTYPE Assets><Assets>${asset("a.blk")}</Assets>`,
    `<Assets>${asset("a.blk").replace('<Type id="28">', '<Type id="28"><Nested/>')}</Assets>`,
  ])
    await assert.rejects(collect(fixture(t, xml)), { name: "Error" }, xml);
});

test("map verification requires nonempty assets and both resource scopes", async (t) => {
  await assert.rejects(inspectAssetMap(fixture(t, "<Assets/>")), /empty Asset Map/);
  await assert.rejects(
    verifyAssetMap(fixture(t, `<Assets>${asset("/StreamingAssets/a.blk")}</Assets>`)),
    /base and Persistent/,
  );
});
