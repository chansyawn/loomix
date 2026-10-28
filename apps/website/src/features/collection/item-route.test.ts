import { describe, expect, it } from "vite-plus/test";
import { collectionItemLocation } from "./item-route";

describe("catalog item destinations", () => {
  it.each([
    ["plants", "plants"],
    ["miscellaneous", "miscellany"],
    ["creatures", "creatures"],
    ["furniture", "furniture"],
    ["clothing", "clothing"],
    ["dishes", "dishes"],
  ] as const)("routes %s items to their existing detail page", (catalogCategory, segment) => {
    expect(collectionItemLocation({ id: 42, catalogCategory })).toEqual({
      to: `/collection/${segment}/items/$id`,
      params: { id: "42" },
    });
  });
});
