import { expect, test } from "vite-plus/test";
import { furnitureSize } from "./size";
test("家具尺寸从原始标签解析，不使用本地化显示文案或生物体型标签", () => {
  expect(furnitureSize(["尺寸_2_1"])).toBe("2.0x1.0");
  expect(furnitureSize(["尺寸_1_2a5"])).toBe("1.0x2.5");
  expect(furnitureSize(["尺寸：2×1", "大"])).toBeNull();
  expect(furnitureSize(["尺寸_1_1", "尺寸_2_2"])).toBeNull();
});
