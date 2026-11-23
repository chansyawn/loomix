import { expect, test } from "vite-plus/test";
import { catalogEntryLocation } from "./entry-location";

test.each([
  { id: 1, kind: "plant" },
  { id: 20, kind: "seed" },
  { id: 100, kind: "plants.series" },
  { id: 200, kind: "furniture" },
  { id: 300, kind: "dish" },
])("$kind 使用自身编号，清空旧查询参数", (record) => {
  expect(catalogEntryLocation(record)).toEqual({
    to: "/catalog/$id",
    params: { id: String(record.id) },
    search: {},
  });
});
