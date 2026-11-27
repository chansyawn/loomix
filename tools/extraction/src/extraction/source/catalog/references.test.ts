import { expect, onTestFinished, test } from "vite-plus/test";
import { createFixture } from "../neighbors/fixtures/tables.ts";
import { imageCollector } from "../images.ts";
import { readReferences } from "./references.ts";

const small = "UISprite/Coins/Small";
const large = "UISprite/Coins/Large";
const missing = "UISprite/Coins/Missing";

test.each([
  { smallPath: small, largePath: large, expected: small, rank: 0 },
  { smallPath: missing, largePath: large, expected: large, rank: 1 },
  { smallPath: small, largePath: small, expected: small, rank: 0 },
  { smallPath: missing, largePath: null, expected: null, rank: null },
])(
  "支付货币按物品身份取图，小图 $smallPath、大图 $largePath",
  ({ smallPath, largePath, expected, rank }) => {
    const fixture = createFixture({
      318: [
        [1, { text: "碎钱" }],
        [2, { text: "碎钱" }],
      ],
      325: [1, 2].map((id) => [id, null, null, null, smallPath, largePath]),
    });
    onTestFinished(fixture.cleanup);
    const { tables } = fixture.input;
    const prefix = "assets/moleres/rel/sres/";
    const images = imageCollector(
      [
        {
          Name: "Small",
          Source: "coins",
          PathID: "1",
          Type: "Sprite",
          Container: `${prefix}UISprite/Coins/Atlas.png`,
        },
        {
          Name: "Large",
          Source: "coins",
          PathID: "2",
          Type: "Texture2D",
          Container: `${prefix}${large}.png`,
        },
      ],
      new Map([["coins", "a".repeat(64)]]),
    );
    const { items } = readReferences(
      { tables, main: tables.byId(318) },
      [1, 2],
      new Set([2]),
      images,
    );
    expect(items.map((item) => item.image)).toEqual([null, { use: "item:2:image" }]);
    expect(images.needs).toHaveLength(1);
    expect(images.needs[0]!.references).toEqual([
      ...new Set([smallPath, largePath].filter(Boolean)),
    ]);
    expect(images.needs[0]!.candidates.map(({ reference, rank }) => ({ reference, rank }))).toEqual(
      expected ? [{ reference: expected, rank }] : [],
    );
  },
);
