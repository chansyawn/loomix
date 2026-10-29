import { describe, expect, it } from "vite-plus/test";
import { collectionFilterChips } from "./filter-chips";
import type { FilterGroup } from "./filter-types";

const treeGroup: FilterGroup<"tags"> = {
  key: "tags",
  label: "食材标签",
  tree: true,
  options: [
    {
      value: "__category",
      label: "分类",
      selectable: false,
      children: [
        {
          value: "vegetarian",
          label: "素食",
          chipLabel: "分类 · 素食",
          children: [
            {
              value: "vegetables",
              label: "蔬菜类",
              chipLabel: "分类 · 素食 / 蔬菜类",
              children: [
                {
                  value: "tomato",
                  label: "番茄",
                  chipLabel: "分类 · 素食 / 蔬菜类 / 番茄",
                },
              ],
            },
            {
              value: "fruit",
              label: "水果类",
              chipLabel: "分类 · 素食 / 水果类",
            },
            {
              value: "reference",
              label: "引用类别",
              chipLabel: "分类 · 素食 / 引用类别",
            },
          ],
        },
      ],
    },
    {
      value: "__color",
      label: "颜色",
      selectable: false,
      children: [{ value: "red", label: "红色", chipLabel: "颜色 · 红色" }],
    },
  ],
};

function renderChips(selected: string[]) {
  let next: string[] | null = null;
  const chips = collectionFilterChips(
    [treeGroup],
    { tags: selected },
    (_key, values) => {
      next = values;
    },
    { value: "", clear: () => {} },
  );
  return { chips, next: () => next };
}

describe("filter chips", () => {
  it("shows only the highest fully selected tree node", () => {
    const { chips } = renderChips([
      "vegetarian",
      "vegetables",
      "tomato",
      "fruit",
      "reference",
      "red",
    ]);

    expect(chips.map((chip) => chip.label)).toEqual(["分类 · 素食", "颜色 · 红色"]);
  });

  it("removes a summarized parent and its entire subtree", () => {
    const { chips, next } = renderChips([
      "vegetarian",
      "vegetables",
      "tomato",
      "fruit",
      "reference",
      "red",
    ]);

    chips[0].remove();
    expect(next()).toEqual(["red"]);
  });

  it("shows complete child branches without the partially selected parent", () => {
    const { chips } = renderChips(["vegetarian", "vegetables", "tomato", "fruit"]);

    expect(chips.map((chip) => chip.label)).toEqual([
      "分类 · 素食 / 蔬菜类",
      "分类 · 素食 / 水果类",
    ]);
  });

  it("keeps plain filter chips unchanged", () => {
    const group: FilterGroup<"tags"> = {
      key: "tags",
      label: "标签",
      options: [
        { value: "first", label: "第一项" },
        { value: "second", label: "第二项" },
      ],
    };
    let next: string[] | null = null;
    const chips = collectionFilterChips(
      [group],
      { tags: ["first", "second"] },
      (_key, values) => {
        next = values;
      },
      { value: "", clear: () => {} },
    );

    expect(chips.map((chip) => chip.label)).toEqual(["标签：第一项", "标签：第二项"]);
    chips[0].remove();
    expect(next).toEqual(["second"]);
  });
});
