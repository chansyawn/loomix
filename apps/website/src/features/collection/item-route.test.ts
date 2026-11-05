import { describe, expect, it, test } from "vite-plus/test";
import { collectionItemLocation, cropDetailLocation } from "./item-route";

describe("catalog item destinations", () => {
  it.each([
    ["plants", "plants"],
    ["miscellaneous", "miscellany"],
    ["creatures", "creatures"],
    ["furniture", "furniture"],
    ["clothing", "clothing"],
    ["dishes", "dishes"],
  ] as const)("routes %s items to their existing detail page", (catalogCategory, segment) => {
    expect(collectionItemLocation({ id: 42, catalogCategory, cropSeriesId: null })).toEqual({
      to: `/collection/${segment}/items/$id`,
      params: { id: "42" },
    });
  });
});

test("routes crop products to their series and selected product tab", () => {
  expect(collectionItemLocation({ id: 42, catalogCategory: "plants", cropSeriesId: 9 })).toEqual({
    to: "/collection/plants/series/$id",
    params: { id: "9" },
    search: { tab: "item-42" },
  });
  expect(cropDetailLocation(9)).toEqual({
    to: "/collection/plants/series/$id",
    params: { id: "9" },
    search: { tab: undefined },
  });
});
