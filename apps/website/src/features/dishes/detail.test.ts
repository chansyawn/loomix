import { isNotFound } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture.ts";
import type { DishItem, DishSeries } from "../collection-view.ts";
import { dishesDetail, loadDishesDetail, parseDishId } from "./detail";

const first: DishItem = {
  id: 1,
  name: "星露烤鱼",
  image: null,
  description: "香气浓郁",
  quality: 2,
  difficulty: "中等",
  galaxyFlavor: "星屿，禾夏",
  cookware: "烤架",
  effectsText: "耐力上限提升 5 点",
  effects: [
    {
      effectId: 1,
      name: "耐力提升",
      description: "耐力上限提升 5 点",
      level: 1,
      uses: null,
      durationSeconds: 30,
    },
  ],
  tastes: ["甜"],
  difficultyRequirement: {
    rawExpression: '{"childList":{"nodeList":[{"leaf":{"chefLevelGreaterOrEqual":{"level":5}}}]}}',
    condition: { kind: "chefLevelGreaterOrEqual", level: 5 },
    unresolvedReason: null,
  },
  acquisition: "烹饪",
  recipe: null,
};
const second: DishItem = { ...first, id: 2, name: "星露蒸鱼" };
const group: DishSeries = {
  id: 3,
  name: "星露系列",
  image: null,
  description: null,
  quality: null,
  seriesName: "河鲜",
  dishIds: [2, 1],
};
const data = {
  items: [first, second],
  series: [
    group,
    { ...group, id: 4, name: "空系列", dishIds: [] },
    { ...group, id: 5, name: "未知系列", dishIds: null },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("dish details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseDishId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseDishId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("returns known series memberships and reports incomplete membership data", () => {
    expect(dishesDetail(data, "items", 1)).toEqual({
      kind: "item",
      record: first,
      catalogItems: data.items,
      ingredientCategoriesById: new Map(),
      ingredientItemsById: new Map(),
      series: [group],
      hasUnconfirmedSeriesMembership: true,
    });
    expect(dishesDetail({ ...data, series: [] }, "items", 1)).toMatchObject({ series: [] });
    expect(
      dishesDetail({ items: [first], series: [{ ...group, dishIds: null }] }, "items", 1),
    ).toMatchObject({ series: [], hasUnconfirmedSeriesMembership: true });
  });

  it("preserves member order and distinguishes unknown members from an empty series", () => {
    expect(dishesDetail(data, "series", 3)).toMatchObject({ items: [second, first] });
    expect(dishesDetail(data, "series", 4)).toMatchObject({ items: [] });
    expect(dishesDetail(data, "series", 5)).toMatchObject({ items: null });
  });

  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["series", 1],
      ["items", 999],
    ] as const) {
      try {
        dishesDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("loads validated content and keeps network or schema failures retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ dishes: data }))));
    expect(await loadDishesDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadDishesDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadDishesDetail("items", "1")).rejects.toThrow();
  });
});
