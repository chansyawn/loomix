import { expect, test } from "vite-plus/test";
import { mergeDetailFields } from "./catalog-detail-presentation";

test("详情保留分类字段的顺序和空值，只补入未展示的通用字段", () => {
  expect(
    mergeDetailFields(
      [
        ["尺寸", "2 × 2"],
        ["品阶", null],
      ],
      [
        ["编号", "42"],
        ["品阶", "普通"],
        ["类别", "家具"],
      ],
    ),
  ).toEqual([
    ["尺寸", "2 × 2"],
    ["品阶", null],
    ["编号", "42"],
    ["类别", "家具"],
  ]);
});
