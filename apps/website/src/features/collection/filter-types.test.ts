import { describe, expect, it } from "vite-plus/test";
import {
  filterSelectionValues,
  summarizeFilterTreeSelection,
  toggleFilterTreeSelection,
  toggleFilterSelection,
  expandedFilterTreeValues,
} from "./filter-types";
import type { FilterOption } from "./filter-types";

const options: FilterOption[] = [
  {
    value: "__food",
    label: "食材",
    selectable: false,
    children: [
      {
        value: "animal",
        label: "荤菜",
        children: [
          {
            value: "fish",
            label: "鱼类",
            children: [{ value: "salmon", label: "三文鱼" }],
          },
          { value: "shrimp", label: "虾类" },
          { value: "crab", label: "蟹类" },
        ],
      },
    ],
  },
];

describe("tree filter selection", () => {
  it("summarizes selected branches by their highest complete node", () => {
    expect(
      summarizeFilterTreeSelection(options, ["animal", "fish", "salmon", "shrimp", "crab"]),
    ).toEqual(["animal"]);
    expect(summarizeFilterTreeSelection(options, ["fish", "salmon", "shrimp"])).toEqual([
      "fish",
      "shrimp",
    ]);
  });

  it("only summarizes tree groups", () => {
    const group = { key: "tags" as const, label: "标签", options, tree: true };
    expect(filterSelectionValues(group, ["animal", "fish", "salmon", "shrimp", "crab"])).toEqual([
      "animal",
    ]);
    expect(
      filterSelectionValues({ ...group, tree: false }, [
        "animal",
        "fish",
        "salmon",
        "shrimp",
        "crab",
      ]),
    ).toEqual(["animal", "fish", "salmon", "shrimp", "crab"]);
  });

  it("expands a parent into its full subtree", () => {
    expect(toggleFilterTreeSelection(options, "animal", true, [])).toEqual([
      "animal",
      "fish",
      "salmon",
      "shrimp",
      "crab",
    ]);
  });

  it("removes an unchecked child and all ancestors that are no longer complete", () => {
    expect(
      toggleFilterTreeSelection(options, "salmon", false, [
        "animal",
        "fish",
        "salmon",
        "shrimp",
        "crab",
      ]),
    ).toEqual(["shrimp", "crab"]);
  });

  it("restores an ancestor after all of its descendants are selected", () => {
    const partial = toggleFilterTreeSelection(options, "fish", true, ["shrimp"]);
    expect(partial).toEqual(["fish", "salmon", "shrimp"]);
    expect(toggleFilterTreeSelection(options, "animal", true, ["shrimp"])).toEqual([
      "animal",
      "fish",
      "salmon",
      "shrimp",
      "crab",
    ]);
  });

  it("clears an entire expanded subtree from its parent", () => {
    expect(
      toggleFilterTreeSelection(options, "animal", false, [
        "animal",
        "fish",
        "salmon",
        "shrimp",
        "crab",
      ]),
    ).toEqual([]);
  });
});

describe("独立树选择", () => {
  const group = {
    key: "tags",
    label: "标签",
    options,
    tree: true,
    selectionMode: "independent" as const,
  };
  it("独立选择只切换当前节点，不选中后代或合并父节点摘要", () => {
    expect(toggleFilterSelection(group, "animal", true, [])).toEqual(["animal"]);
    expect(toggleFilterSelection(group, "animal", false, ["animal", "fish", "salmon"])).toEqual([
      "fish",
      "salmon",
    ]);
    expect(toggleFilterSelection(group, "salmon", true, ["fish"])).toEqual(["fish", "salmon"]);
    expect(filterSelectionValues(group, ["animal", "fish", "salmon"])).toEqual([
      "animal",
      "fish",
      "salmon",
    ]);
  });
  it("自动展开已选节点的祖先路径，同时保留默认展开分支", () => {
    expect([...expandedFilterTreeValues(options, ["salmon"])]).toEqual([
      "fish",
      "animal",
      "__food",
    ]);
    expect([...expandedFilterTreeValues(options, [])]).toEqual([]);
    expect([
      ...expandedFilterTreeValues([{ value: "default", label: "默认", defaultExpanded: true }], []),
    ]).toEqual(["default"]);
  });
});
