import { describe, expect, it } from "vite-plus/test";
import { toggleFilterTreeSelection } from "./filter-types";
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
