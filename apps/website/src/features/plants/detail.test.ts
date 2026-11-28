import { isNotFound } from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../omnidex-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "./fixture";
import { plantsDetail, loadPlantsDetail, parsePlantId } from "./detail";
import { ingredientsFixture } from "../ingredients/fixture";

const first = plantItemFixture({ id: 1, name: "星露花" });
const second = plantItemFixture({ id: 2, name: "星露果" });
const seed = plantSeedFixture({ id: 10, plantIds: [2, 1] });
const group = plantSeriesFixture({ id: 100, plantIds: [2, 1] });
const data = plantsDataFixture({
  items: [first, second],
  seeds: [seed],
  series: [
    group,
    plantSeriesFixture({ id: 200, plantIds: [] }),
    plantSeriesFixture({ id: 300, plantIds: null }),
  ],
});

afterEach(() => vi.unstubAllGlobals());

test("种子、普通植物与作物都有自身详情，含作物的系列仍为普通系列", () => {
  const items = [1, 4, 8].map((id) => plantItemFixture({ id, category: "作物" }));
  const input = plantsDataFixture({
    items,
    seeds: [seed],
    series: [plantSeriesFixture({ id: 100, plantIds: [4, 1, 8] })],
  });
  const ingredients = ingredientsFixture().data;
  const expectedDishes = new Map([
    [1, [100, 102]],
    [4, [102]],
    [8, []],
  ]);
  for (const item of items) {
    const detail = plantsDetail(input, "items", item.id, ingredients);
    if (detail.kind !== "item") throw new Error("应为单品详情");
    expect(detail.record).toBe(item);
    expect(detail.cooking?.dishes.map((match) => match.dish.id) ?? []).toEqual(
      expectedDishes.get(item.id),
    );
  }
  expect(plantsDetail(input, "seeds", 10, ingredients)).toMatchObject({
    kind: "seed",
    record: seed,
    items: [items[0]],
  });
  const seriesDetail = plantsDetail(input, "series", 100, ingredients);
  expect(seriesDetail).toMatchObject({ kind: "series", items: [items[1], items[0], items[2]] });
  expect(seriesDetail).not.toHaveProperty("cookingByItemId");
  expect(plantsDetail(input, "seeds", 10, ingredients)).not.toHaveProperty("cooking");
});

test("独立种子保留关联植物顺序，单品通过顶部导航关联种子", () => {
  expect(plantsDetail(data, "seeds", 10)).toMatchObject({
    kind: "seed",
    record: seed,
    items: [second, first],
  });
  expect(plantsDetail(data, "items", 1)).toMatchObject({
    kind: "item",
    record: first,
    cooking: null,
    matureForms: [],
    navigation: { hasUnconfirmedMembership: true },
  });
  const detail = plantsDetail({ ...data, series: [] }, "items", 1);
  if (detail.kind !== "item") throw new Error("应为单品详情");
  expect(detail.record).toBe(first);
  expect(detail.navigation.groups[0].entries.map((entry) => entry.id)).toEqual([10, 2, 1]);
});

test("系列成员保留顺序，未知成员与空列表分开表达", () => {
  expect(plantsDetail(data, "series", 100)).toMatchObject({ items: [second, first] });
  expect(plantsDetail(data, "series", 200)).toMatchObject({ items: [] });
  expect(plantsDetail(data, "series", 300)).toMatchObject({ items: null });
});

test("仅接受正安全整数编号", () => {
  expect(parsePlantId("1")).toBe(1);
  for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"])
    expect(() => parsePlantId(value)).toThrow(expect.objectContaining({ isNotFound: true }));
});

test("错误类型和未知编号返回未找到", () => {
  for (const [view, id] of [
    ["items", 100],
    ["series", 1],
    ["seeds", 1],
    ["items", 999],
    ["seeds", 999],
  ] as const) {
    try {
      plantsDetail(data, view, id);
      throw new Error("应返回未找到");
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
  }
});

test("加载独立种子与植物数据，资源失败仍可重试", async () => {
  vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ plants: data }))));
  expect(await loadPlantsDetail("items", "1")).toMatchObject({ record: { id: 1 } });
  expect(await loadPlantsDetail("seeds", "10")).toMatchObject({ record: { id: 10 } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  await expect(loadPlantsDetail("seeds", "10")).rejects.toThrow("503");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  await expect(loadPlantsDetail("items", "1")).rejects.toThrow();
});
