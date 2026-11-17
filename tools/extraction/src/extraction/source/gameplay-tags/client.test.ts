import { expect, test } from "vite-plus/test";
import { createClientGameplayTags } from "./client.ts";

const tables = { key: (key: string | null | undefined) => (key === "red" ? "红色" : null) };
const tree = {
  1: { TagId: 1, TagName: "颜色", ParentId: 4294967295, EnumName: "Color" },
  2: { TagId: 2, TagName: "红", ParentId: 1, EnumName: "Red" },
};

test("客户端标签仅归一化明确的无父级哨兵，统一解析显示文本", () => {
  const result = createClientGameplayTags(tree, { 2: { nameInGame: { textId: "red" } } }, tables);
  expect(result.tags[0]!.parentId).toBeNull();
  expect(result.tags[1]!.displayName).toBe("红色");
  expect(result.index.ancestors(2).map((tag) => tag.id)).toEqual([2, 1]);
});

test("未知父级和字典键与标签ID不一致均停止提取", () => {
  expect(() => createClientGameplayTags({ 1: { ...tree[1], ParentId: 99 } }, {}, tables)).toThrow(
    "Unknown parent tag",
  );
  expect(() => createClientGameplayTags({ 99: tree[1] }, {}, tables)).toThrow("key mismatch");
});
