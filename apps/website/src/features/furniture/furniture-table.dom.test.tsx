// @vitest-environment happy-dom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultStringifySearch,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { FurnitureItem, FurnitureSet } from "../collection-view";
import type { FurnitureData } from "./data";
import { FurniturePage } from "./furniture-page";
import { FurnitureReturnLink } from "./detail-navigation";
import {
  compactFurnitureSearchMiddleware,
  furnitureSearchSchema,
  type FurnitureSearchInput,
} from "./search";

const chair: FurnitureItem = {
  id: 1,
  name: "木椅",
  quality: 1,
  image: null,
  description: null,
  category: "起居",
  type: "椅",
  size: "1 × 1",
  colors: "黄色",
  materials: "木制",
  sources: "制作",
};
const table: FurnitureItem = {
  ...chair,
  id: 2,
  name: "木桌",
  quality: 3,
  type: "桌",
  colors: "白色",
};
const lamp: FurnitureItem = {
  ...chair,
  id: 3,
  name: "台灯",
  quality: null,
  category: null,
  type: null,
  size: null,
  colors: null,
  materials: null,
  sources: null,
};
const suite: FurnitureSet = {
  id: 10,
  name: "木制套装",
  quality: 2,
  image: null,
  description: "温暖木色",
  seriesName: "森林系列",
  componentIds: [1, 2],
};
const fixture: FurnitureData = {
  items: [chair, lamp, table],
  sets: [
    suite,
    { ...suite, id: 11, name: "空套装", componentIds: [] },
    { ...suite, id: 12, name: "未知套装", componentIds: null },
  ],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function setup(search: FurnitureSearchInput = { layout: "table" }, data = fixture) {
  const root = createRootRoute({
    component: function Root() {
      return (
        <div data-scroll-restoration-id="wiki-content">
          <Outlet />
        </div>
      );
    },
  });
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture",
    validateSearch: furnitureSearchSchema,
    search: { middlewares: [compactFurnitureSearchMiddleware] },
    component: function List() {
      const state = list.useSearch();
      const navigate = list.useNavigate();
      return (
        <FurniturePage
          data={data}
          search={state}
          onSearchChange={(update, replace = false) =>
            navigate({ search: update, replace, resetScroll: false })
          }
        />
      );
    },
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture/items/$id",
    component: () => (
      <>
        <h1>家具详情</h1>
        <FurnitureReturnLink view="items">返回家具列表</FurnitureReturnLink>
      </>
    ),
  });
  const set = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture/sets/$id",
    component: () => (
      <>
        <h1>套装详情</h1>
        <FurnitureReturnLink view="sets">返回家具列表</FurnitureReturnLink>
      </>
    ),
  });
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [`/collection/furniture${defaultStringifySearch(search)}`],
    }),
    routeTree: root.addChildren([list, item, set]),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole("textbox", { name: "搜索家具名称" });
  return router;
}

function itemNames() {
  return within(screen.getByRole("table", { name: "家具单件表格" }))
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/collection/furniture/items/"))
    .map((link) => link.textContent);
}

test("switches cards and table without losing filters and restores layout through history", async () => {
  const user = userEvent.setup();
  const router = await setup({ items: { q: "木", colors: ["黄色"] } });
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "卡片视图" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "表格视图" }));
  expect(await screen.findByRole("table")).toBeVisible();
  expect(itemNames()).toEqual(["木椅"]);
  expect(router.state.location.search).toMatchObject({
    layout: "table",
    items: { q: "木", colors: ["黄色"] },
  });
  await user.click(screen.getByRole("button", { name: "清空筛选" }));
  await waitFor(() => expect(itemNames()).toEqual(["木椅", "台灯", "木桌"]));
  expect(router.state.location.search).toMatchObject({ layout: "table" });
  await user.click(screen.getByRole("button", { name: "卡片视图" }));
  await waitFor(() => expect(screen.queryByRole("table")).not.toBeInTheDocument());
  router.history.back();
  expect(await screen.findByRole("table")).toBeVisible();
  expect(screen.getByRole("button", { name: "表格视图" })).toHaveAttribute("aria-pressed", "true");
});

test("cycles header sorting with the toolbar and keeps missing quality last", async () => {
  const user = userEvent.setup();
  const router = await setup();
  await user.click(screen.getByRole("button", { name: "品阶" }));
  expect(screen.getByRole("button", { name: "品阶" })).toHaveFocus();
  await waitFor(() =>
    expect(screen.getByRole("columnheader", { name: "品阶" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    ),
  );
  expect(itemNames()).toEqual(["木椅", "木桌", "台灯"]);
  expect(screen.getByRole("combobox", { name: "家具排序" })).toHaveTextContent("品阶：从低到高");
  await user.click(screen.getByRole("button", { name: "品阶" }));
  await waitFor(() =>
    expect(screen.getByRole("columnheader", { name: "品阶" })).toHaveAttribute(
      "aria-sort",
      "descending",
    ),
  );
  expect(itemNames()).toEqual(["木桌", "木椅", "台灯"]);
  expect(router.state.location.search).toMatchObject({ items: { sort: "quality-desc" } });
  await user.click(screen.getByRole("button", { name: "品阶" }));
  await waitFor(() =>
    expect(screen.getByRole("columnheader", { name: "品阶" })).toHaveAttribute("aria-sort", "none"),
  );
  expect(itemNames()).toEqual(["木椅", "台灯", "木桌"]);
  await user.click(screen.getByRole("combobox", { name: "家具排序" }));
  await user.click(await screen.findByRole("option", { name: "名称：降序" }));
  await waitFor(() =>
    expect(screen.getByRole("columnheader", { name: "名称" })).toHaveAttribute(
      "aria-sort",
      "descending",
    ),
  );
  expect(itemNames()).toEqual(["台灯", "木桌", "木椅"]);
});

test("keeps the count and clear action outside the filters and preserves individual removal", async () => {
  const user = userEvent.setup();
  const router = await setup({
    layout: "table",
    items: { categories: ["起居"], colors: ["黄色"] },
  });
  const filters = screen.getByRole("region", { name: "当前筛选" });
  expect(screen.getByRole("status")).toHaveTextContent("1 件家具");
  expect(screen.getByRole("status")).toBeVisible();
  expect(screen.getByRole("button", { name: "清空筛选" })).toBeVisible();
  expect(within(filters).queryByRole("status")).not.toBeInTheDocument();
  expect(within(filters).queryByRole("button", { name: "清空筛选" })).not.toBeInTheDocument();

  await user.click(within(filters).getByRole("button", { name: "移除颜色：黄色" }));
  await waitFor(() => expect(itemNames()).toEqual(["木椅", "木桌"]));
  expect(screen.getByRole("status")).toHaveTextContent("2 件家具");
  expect(screen.queryByRole("button", { name: "移除颜色：黄色" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "移除分类：起居" })).toBeVisible();
  expect(router.state.location.search).toMatchObject({
    layout: "table",
    items: { categories: ["起居"] },
  });

  await user.click(screen.getByRole("button", { name: "清空筛选" }));
  await waitFor(() => expect(itemNames()).toEqual(["木椅", "台灯", "木桌"]));
  expect(screen.getByRole("status")).toHaveTextContent("3 件家具");
  expect(screen.queryByRole("button", { name: "清空筛选" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "当前筛选" })).not.toBeInTheDocument();
  expect(router.state.location.search).toMatchObject({ layout: "table" });
});

test("shows fades only at scrollable filter edges and updates them after resizing", async () => {
  const resizeCallbacks = new Set<() => void>();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: () => void) {}
      observe() {
        resizeCallbacks.add(this.callback);
      }
      disconnect() {
        resizeCallbacks.delete(this.callback);
      }
    },
  );
  await setup({ layout: "table", items: { categories: ["起居"], colors: ["黄色"] } });
  const filters = screen.getByRole("region", { name: "当前筛选" });
  let clientWidth = 200;
  let scrollWidth = 600;
  Object.defineProperties(filters, {
    clientWidth: { get: () => clientWidth },
    scrollWidth: { get: () => scrollWidth },
  });
  const resize = () => act(() => resizeCallbacks.forEach((callback) => callback()));
  const expectFades = (left: boolean, right: boolean) => {
    if (left) expect(screen.getByTestId("filter-summary-fade-left")).toBeVisible();
    else expect(screen.queryByTestId("filter-summary-fade-left")).not.toBeInTheDocument();
    if (right) expect(screen.getByTestId("filter-summary-fade-right")).toBeVisible();
    else expect(screen.queryByTestId("filter-summary-fade-right")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.getByRole("button", { name: "清空筛选" })).toBeVisible();
  };

  expectFades(false, false);
  resize();
  expectFades(false, true);
  fireEvent.scroll(filters, { target: { scrollLeft: 160 } });
  expectFades(true, true);
  fireEvent.scroll(filters, { target: { scrollLeft: 399.5 } });
  expectFades(true, false);
  fireEvent.scroll(filters, { target: { scrollLeft: 0 } });
  expectFades(false, true);

  clientWidth = 700;
  resize();
  expectFades(false, false);
  clientWidth = 200;
  resize();
  expectFades(false, true);
  scrollWidth = 180;
  resize();
  expectFades(false, false);
});

test("searches in table mode and clears empty results without resetting layout", async () => {
  const user = userEvent.setup();
  const router = await setup();
  const input = screen.getByRole("textbox", { name: "搜索家具名称" });
  await user.type(input, "木桌");
  await waitFor(() => expect(itemNames()).toEqual(["木桌"]));
  expect(router.state.location.state.__TSR_index).toBe(0);
  await user.clear(input);
  await user.type(input, "不存在");
  await waitFor(() => expect(screen.queryByRole("table")).not.toBeInTheDocument());
  expect(screen.getByRole("status")).toHaveTextContent("0 件家具");
  await user.click(screen.getByRole("button", { name: "清除搜索" }));
  expect(await screen.findByRole("table")).toBeVisible();
  expect(router.state.location.search).toMatchObject({ layout: "table" });
});

test("renders missing data and preserves table origin from item and membership links", async () => {
  const user = userEvent.setup();
  const router = await setup({ layout: "table", items: { sort: "quality-desc" } });
  const missing = screen.getByRole("row", { name: /台灯/ });
  expect(within(missing).getAllByText("未提供")).toHaveLength(7);
  expect(within(missing).getByText("未归入套装")).toBeVisible();
  const href = router.state.location.href;
  await user.click(screen.getByRole("link", { name: "木桌" }));
  expect(await screen.findByRole("heading", { name: "家具详情" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "返回家具列表" }));
  expect(await screen.findByRole("table")).toBeVisible();
  expect(router.state.location.href).toBe(href);
  await user.click(
    within(screen.getByRole("row", { name: /木桌/ })).getByRole("link", { name: "木制套装" }),
  );
  expect(await screen.findByRole("heading", { name: "套装详情" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "返回家具列表" }));
  expect(await screen.findByRole("table")).toBeVisible();
  expect(router.state.location.href).toBe(href);
});

test("shares layout across item and set tabs while preserving their independent queries", async () => {
  const user = userEvent.setup();
  await setup({ layout: "table", items: { q: "木桌" }, sets: { sort: "quality-desc" } });
  await user.click(screen.getByRole("tab", { name: /家具套装/ }));
  expect(await screen.findByRole("table", { name: "家具套装表格" })).toBeVisible();
  expect(screen.queryByRole("columnheader", { name: "获取途径" })).not.toBeInTheDocument();
  expect(screen.getByRole("row", { name: /木制套装/ })).toHaveTextContent("2 件家具");
  expect(screen.getByRole("row", { name: /空套装/ })).toHaveTextContent("0 件家具");
  expect(screen.getByRole("row", { name: /未知套装/ })).toHaveTextContent("未提供");
  await user.click(screen.getByRole("link", { name: "空套装" }));
  expect(await screen.findByRole("heading", { name: "套装详情" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "返回家具列表" }));
  expect(await screen.findByRole("table", { name: "家具套装表格" })).toBeVisible();
  await user.click(screen.getByRole("tab", { name: /家具单件/ }));
  expect(await screen.findByRole("textbox", { name: "搜索家具名称" })).toHaveValue("木桌");
  expect(itemNames()).toEqual(["木桌"]);
});

test("bounds the rendered rows of a large table while exposing the full accessible row count", async () => {
  const items = Array.from({ length: 887 }, (_, index) => ({
    ...chair,
    id: index + 1,
    name: `家具 ${index + 1}`,
  }));
  await setup({ layout: "table" }, { items, sets: [] });
  const grid = screen.getByRole("table");
  expect(grid).toHaveAttribute("aria-rowcount", "888");
  expect(within(grid).getAllByRole("link").length).toBeLessThan(100);
  expect(screen.getByRole("link", { name: "家具 1" })).toBeVisible();
});

test("resets the list scroll when queries change but not when returning from details", async () => {
  const user = userEvent.setup();
  await setup();
  const link = screen.getByRole("link", { name: "木桌" });
  const scroller = link.closest<HTMLDivElement>("[data-scroll-restoration-id]")!;
  scroller.scrollTop = 1200;
  vi.spyOn(scroller, "scrollTo").mockImplementation((options: ScrollToOptions | number) => {
    if (typeof options === "object") scroller.scrollTop = options.top ?? 0;
  });
  await user.click(screen.getByRole("button", { name: "品阶" }));
  await waitFor(() => expect(scroller.scrollTop).toBe(0));
  scroller.scrollTop = 640;
  await user.click(screen.getByRole("link", { name: "木桌" }));
  expect(await screen.findByRole("heading", { name: "家具详情" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "返回家具列表" }));
  expect(await screen.findByRole("table")).toBeVisible();
  expect(scroller.scrollTop).toBe(640);
});

test("keeps a furniture name link available when its thumbnail fails to load", async () => {
  await setup(
    { layout: "table" },
    { items: [{ ...chair, image: "assets/missing.webp" }], sets: [] },
  );
  const image = screen.getByRole("img", { name: "木椅", hidden: true });
  fireEvent.error(image);
  expect(screen.queryByRole("img", { name: "木椅", hidden: true })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "木椅" })).toHaveAttribute(
    "href",
    "/collection/furniture/items/1",
  );
});
