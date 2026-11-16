import { expect, test } from "vite-plus/test";
import { formatFurnitureSize } from "./size";

test("家具尺寸保留一位小数并按宽×深展示", () => {
  expect(formatFurnitureSize({ width: 2, depth: 1 })).toBe("2.0x1.0");
  expect(formatFurnitureSize({ width: 1, depth: 2.5 })).toBe("1.0x2.5");
});
