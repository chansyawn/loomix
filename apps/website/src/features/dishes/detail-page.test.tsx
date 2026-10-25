import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { emptyCatalog, parseCatalog } from "@loomix/content-schema";
import type { Recipe, RecordBase } from "@loomix/content-schema";
import { toCollectionView } from "../collection-view";
import { dishesDetail } from "./detail";
import { DishesDetailPage } from "./detail-page";

const base = (id: number, name: string): RecordBase => ({
  id,
  name,
  image: null,
  description: null,
  quality: null,
  encyclopediaEntry: { listed: true },
});

function catalogWithRecipe(recipe: Recipe | null) {
  const catalog = emptyCatalog({
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
  });
  catalog.ingredientCategories = [
    { id: 100, tagName: "食材_水果", name: "水果", parentId: null, itemIds: [2] },
    { id: 101, tagName: "食材_鲜花", name: "鲜花", parentId: null, itemIds: [3] },
    { id: 102, tagName: "食材_空类别", name: "空类别", parentId: null, itemIds: [] },
  ];
  catalog.items.push(
    {
      ...base(1, "和煦花果茶"),
      category: "dishes",
      kind: "item",
      subcategory: null,
      attributes: { difficulty: null, galaxyFlavor: null, cookware: null, effects: null },
      recipe,
    },
    {
      ...base(2, "星露草莓"),
      category: "plants",
      kind: "item",
      subcategory: "采摘材料",
      attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null },
    },
    {
      ...base(3, "蓝铃花"),
      category: "plants",
      kind: "item",
      subcategory: "采摘材料",
      attributes: { originGalaxy: null, maturityPeriod: null, harvestCount: null },
    },
    {
      ...base(4, "茶饮系列"),
      category: "dishes",
      kind: "series",
      memberIds: [1],
    },
  );
  return catalog;
}

async function renderDish(
  recipe: Recipe | null,
  kind: "items" | "series" = "items",
): Promise<string> {
  const view = toCollectionView(parseCatalog(catalogWithRecipe(recipe)));
  const detail = dishesDetail(
    {
      ...view.dishes,
      ingredientCategoriesById: view.ingredientCategoriesById,
      ingredientItemsById: view.ingredientItemsById,
    },
    kind,
    kind === "items" ? 1 : 4,
  );
  const root = createRootRoute({ component: () => <DishesDetailPage detail={detail} /> });
  const index = createRoute({ getParentRoute: () => root, path: "/" });
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe("dish recipe detail rendering", () => {
  it("shows readable conditions and expandable category candidates before the raw expression", async () => {
    const html = await renderDish({
      slots: [
        {
          field: 20,
          rawExpression: "食材_水果|食材_鲜花",
          expression: {
            kind: "any",
            terms: [
              { kind: "category", categoryId: 100 },
              { kind: "category", categoryId: 101 },
            ],
          },
          itemIds: [2, 3],
          quantity: null,
        },
      ],
    });
    expect(html).toContain("原始条件：");
    expect(html).toContain("食材_水果|食材_鲜花");
    expect(html).toContain("任选");
    expect(html).toContain("食材条件 1");
    expect(html).not.toContain("食材槽位 20");
    expect(html).toContain("水果候选物品");
    expect(html).toContain("鲜花候选物品");
    expect(html).toContain("1 件物品");
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("用量：未确认");
    expect(html).toContain('href="/collection/plants/items/2"');
    expect(html).toContain("星露草莓");
    expect(html.indexOf("水果候选物品")).toBeLessThan(html.indexOf("原始条件："));
    expect(html.indexOf('id="dish-recipe"')).toBeLessThan(html.indexOf('id="related-dishes"'));
  });

  it("keeps mixed simultaneous and alternative requirements grouped, and numbers repeated conditions", async () => {
    const html = await renderDish({
      slots: [
        {
          field: 20,
          rawExpression: "食材_水果&食材_鲜花|食材_水果",
          expression: {
            kind: "any",
            terms: [
              {
                kind: "all",
                terms: [
                  { kind: "category", categoryId: 100 },
                  { kind: "category", categoryId: 101 },
                ],
              },
              { kind: "category", categoryId: 100 },
            ],
          },
          itemIds: [2],
          quantity: null,
        },
        {
          field: 30,
          rawExpression: "食材_水果",
          expression: { kind: "category", categoryId: 100 },
          itemIds: [2],
          quantity: null,
        },
      ],
    });
    expect(html).toContain('aria-label="任选"');
    expect(html).toContain('aria-label="同时满足"');
    expect(html).toContain("食材条件 2");
    expect(html.indexOf("食材条件 1")).toBeLessThan(html.indexOf("食材条件 2"));
    expect(html.match(/用量：未确认/g)).toHaveLength(2);
  });

  it.each([
    { recipe: null, message: "配方行未提供" },
    { recipe: { slots: null }, message: "配方行存在，食材槽位未确认" },
    { recipe: { slots: [] }, message: "已确认无需食材" },
  ])("distinguishes the empty recipe state: $message", async ({ recipe, message }) => {
    const html = await renderDish(recipe);
    expect(html).toContain(message);
    expect(html).not.toContain("食材条件 1");
  });

  it("retains the raw expression when a condition cannot be parsed", async () => {
    const html = await renderDish({
      slots: [
        {
          field: 20,
          rawExpression: "食材_未收录",
          expression: null,
          itemIds: null,
          quantity: null,
        },
      ],
    });
    expect(html).toContain("条件解析失败");
    expect(html).toContain("食材_未收录");
    expect(html).not.toContain("已确认无需食材");
  });

  it("shows an empty category and distinguishes no matching items from no required ingredients", async () => {
    const html = await renderDish({
      slots: [
        {
          field: 20,
          rawExpression: "食材_空类别",
          expression: { kind: "category", categoryId: 102 },
          itemIds: [],
          quantity: null,
        },
      ],
    });
    expect(html).toContain("空类别");
    expect(html).toContain("0 件物品");
    expect(html).toContain("暂无正式收录物品");
    expect(html).toContain("没有匹配的正式收录物品");
    expect(html).not.toContain("已确认无需食材");
  });

  it("keeps the series detail focused on its dishes", async () => {
    const html = await renderDish(null, "series");
    expect(html).toContain("茶饮系列");
    expect(html).toContain("系列成员");
    expect(html).toContain('href="/collection/dishes/items/1"');
    expect(html).not.toContain('id="dish-recipe"');
  });
});
