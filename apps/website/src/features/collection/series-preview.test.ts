import { describe, expect, it } from "vite-plus/test";
import { seriesPreview } from "./series-preview";

const items = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  image: index === 1 ? null : `image-${index}`,
}));

describe("系列图片预览", () => {
  it("按成员顺序选取前六个有图成员，跳过缺失条目", () => {
    const memberIds = [8, 2, 99, 7, 6, 5, 4, 3, 1];
    expect(seriesPreview(memberIds, items).map((item) => item.id)).toEqual([8, 7, 6, 5, 4, 3]);
    expect(memberIds).toEqual([8, 2, 99, 7, 6, 5, 4, 3, 1]);
    expect(items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("保留不足六个的有图成员", () => {
    expect(seriesPreview([4, 3, 1], items)).toEqual([items[3], items[2], items[0]]);
  });

  it("成员未知、为空或没有可用图片时返回空预览", () => {
    expect(seriesPreview(null, items)).toEqual([]);
    expect(seriesPreview([], items)).toEqual([]);
    expect(seriesPreview([2, 99], items)).toEqual([]);
    expect(seriesPreview([1], [])).toEqual([]);
  });
});
