import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "vite-plus/test";
import { decodeBytes, decodeTextMapBucket, ObbReader } from "./obb.ts";
import { createIconResolver } from "../../tasks/content/icon-resolver.ts";
import { profile } from "../../profile.ts";

const fixtures: {
  scalars: { encodedHex: string; expectedUnsigned?: number; expectedSigned?: number }[];
  samples: { encodedHex: string; length: number; expected: string }[];
  buckets: { encodedHex: string; expected: { hash: number; index: number } | null }[];
} = JSON.parse(
  fs.readFileSync(new URL("./fixtures/decoder-samples.json", import.meta.url), "utf8"),
);

test("real OBB scalar bytes preserve root and signed vtable offsets", () => {
  for (const fixture of fixtures.scalars) {
    const reader = new ObbReader(Buffer.from(fixture.encodedHex, "hex"));
    if (fixture.expectedUnsigned !== undefined)
      assert.equal(reader.u32(0), fixture.expectedUnsigned);
    if (fixture.expectedSigned !== undefined) {
      assert.ok(fixture.expectedSigned < 0);
      assert.equal(reader.i32(0), fixture.expectedSigned);
    }
  }
  assert.equal(new ObbReader(Buffer.alloc(4)).fields(0), null);
});

test("real odd and long string bytes decode exactly", () => {
  for (const fixture of fixtures.samples) {
    const bytes = Buffer.from(fixture.encodedHex, "hex");
    assert.equal(bytes.length, fixture.length);
    assert.equal(decodeBytes(bytes).toString("utf8"), fixture.expected);
  }
  assert.equal(fixtures.samples[0].length, 71);
  assert.equal(fixtures.samples[1].length, 353);
});

test("real TextMap buckets distinguish empty slots and exact indices", () => {
  for (const fixture of fixtures.buckets)
    assert.deepEqual(decodeTextMapBucket(Buffer.from(fixture.encodedHex, "hex")), fixture.expected);
  assert.throws(() => decodeTextMapBucket(Buffer.alloc(4)), /8 bytes/);
});

test("atlas icon requires both exact Sprite path and exact name", () => {
  const reference = "UISprite/Load/MagicChatTable/Img_MagicChatTable_Flower";
  const container = profile.assetPrefix + reference.toLowerCase() + ".png";
  const texture = {
    Container: container,
    Name: "sactx-atlas",
    Source: "C:/game/PetitPlanet_Data/StreamingAssets/a.blk",
    PathID: "1",
  };
  const sprite = {
    Container: container,
    Name: "Img_MagicChatTable_Flower",
    Source: texture.Source,
    PathID: "3",
  };
  const wrong = { ...sprite, Container: "assets/art/ui/flower.png", PathID: "2" };
  const overlay = { ...sprite, Source: "C:/game/PetitPlanet_Data/Persistent/b.blk", PathID: "4" };
  const resolve = createIconResolver([texture], [wrong, sprite, overlay]);
  assert.equal(resolve(reference)?.pathId, "4");
  assert.equal(resolve(reference)?.assetType, "Sprite");
  assert.equal(createIconResolver([texture], [wrong])(reference)?.matched, false);
  assert.equal(
    createIconResolver([texture], [{ ...sprite, Name: "Other" }])(reference)?.matched,
    false,
  );
});

test("file ID prefixes do not produce icon matches", () => {
  const unrelated = {
    Container: profile.assetPrefix + "uisprite/load/item/16_old_shovel_s.png",
    Name: "16_old_shovel_s",
    Source: "C:/game/a.blk",
    PathID: "1",
  };
  assert.equal(
    createIconResolver(
      [unrelated],
      [],
    )("UISprite/Load/BigPic/DIYHandbook_TopicFurn/TopicFurn_016.png")?.matched,
    false,
  );
});
