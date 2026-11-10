import { expect, test } from "vite-plus/test";
import { collectionItemLocation, cropDetailLocation } from "./item-route";
test.each(["plants", "miscellaneous", "creatures", "furniture", "clothing", "dishes"] as const)(
  "所有类别 %s 使用统一记录地址",
  (catalogCategory) => {
    expect(collectionItemLocation({ id: 42, catalogCategory, cropSeriesId: null })).toEqual({
      to: "/collections/records/$id",
      params: { id: "42" },
      search: { focus: undefined },
    });
  },
);
test("作物产物使用所属系列及统一focus", () => {
  expect(collectionItemLocation({ id: 42, catalogCategory: "plants", cropSeriesId: 9 })).toEqual({
    to: "/collections/records/$id",
    params: { id: "9" },
    search: { focus: 42 },
  });
  expect(cropDetailLocation(9)).toEqual({
    to: "/collections/records/$id",
    params: { id: "9" },
    search: { focus: undefined },
  });
});
