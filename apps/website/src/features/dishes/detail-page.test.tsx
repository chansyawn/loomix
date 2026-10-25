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
  );
  return catalog;
}

async function renderDish(recipe: Recipe | null): Promise<string> {
  const view = toCollectionView(parseCatalog(catalogWithRecipe(recipe)));
  const detail = dishesDetail(
    {
      ...view.dishes,
      ingredientCategoriesById: view.ingredientCategoriesById,
      ingredientItemsById: view.ingredientItemsById,
    },
    "items",
    1,
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
  it("shows expression operators, expandable categories, formal item links and unknown quantity", async () => {
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
    expect(html).toContain("水果 · 1 件正式收录物品");
    expect(html).toContain("鲜花 · 1 件正式收录物品");
    expect(html).toContain("用量：未确认");
    expect(html).toContain('href="/collection/plants/items/2"');
    expect(html).toContain("星露草莓");
  });

  it("distinguishes missing recipe, unknown slots, parse failures and empty candidates", async () => {
    const noRecipe = await renderDish(null);
    expect(noRecipe).toContain("配方行未提供");

    const noSlots = await renderDish({ slots: null });
    expect(noSlots).toContain("食材槽位未确认");

    const parseFailure = await renderDish({
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
    expect(parseFailure).toContain("条件解析失败");

    const emptyCandidates = await renderDish({
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
    expect(emptyCandidates).toContain("空类别 · 0 件正式收录物品");
    expect(emptyCandidates).toContain("没有匹配的正式收录物品");
  });
});
