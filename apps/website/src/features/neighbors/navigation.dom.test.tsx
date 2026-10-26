// @vitest-environment happy-dom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  stripSearchParams,
} from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { loadNeighbors } from "./data";
import { loadNeighborDetail } from "./detail";
import { NeighborDetailPage } from "./detail-page";
import { NeighborsPage } from "./list-page";
import { neighborsSearchSchema } from "./search";
import { NeighborsError, NeighborNotFound } from "./states";
import { neighborFixture } from "./fixture";

const fixture = neighborFixture();
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function setup(entry = "/neighbors") {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return new Response(
      JSON.stringify(url.endsWith("neighbor-images.json") ? fixture.mapping : fixture.database),
    );
  });
  const root = createRootRoute({ component: Outlet });
  const list = createRoute({
    getParentRoute: () => root,
    path: "/neighbors",
    validateSearch: neighborsSearchSchema,
    search: { middlewares: [stripSearchParams({ q: "", galaxy: "" })] },
    loader: () => loadNeighbors(),
    errorComponent: NeighborsError,
    component: function ListRoute() {
      const data = list.useLoaderData();
      const search = list.useSearch();
      const navigate = list.useNavigate();
      return (
        <NeighborsPage
          data={data}
          search={search}
          onSearchChange={(update, replace = false) =>
            navigate({ search: update, replace, resetScroll: false })
          }
        />
      );
    },
  });
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/neighbors/$id",
    loader: ({ params }) => loadNeighborDetail(params.id),
    notFoundComponent: NeighborNotFound,
    component: function DetailRoute() {
      return <NeighborDetailPage neighbor={detail.useLoaderData()} />;
    },
  });
  const history = createMemoryHistory({ initialEntries: [entry] });
  const router = createRouter({ routeTree: root.addChildren([list, detail]), history });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

test("list search replaces history, galaxy filters push history and cards preserve the return query", async () => {
  const user = userEvent.setup();
  const router = await setup();
  const input = await screen.findByRole("textbox", { name: "搜索友邻或星球" });
  await user.type(input, "星球");
  await waitFor(() => expect(router.state.location.search).toMatchObject({ q: "星球" }));
  expect(router.state.location.state.__TSR_index).toBe(0);
  await user.click(screen.getByRole("button", { name: "禾夏" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("找到 2 位友邻"));
  expect(router.state.location.state.__TSR_index).toBe(1);
  const listHref = router.state.location.href;
  await user.click(screen.getByRole("link", { name: /蛮蛮 蛮蛮的星球/ }));
  expect(await screen.findByRole("heading", { level: 1, name: "蛮蛮" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "友邻故事" }));
  await waitFor(() => expect(router.state.location.hash).toBe("stories"));
  expect(screen.getByRole("button", { name: "第 1 章 · 启程" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await user.click(screen.getByRole("link", { name: "返回友邻列表" }));
  await waitFor(() => expect(router.state.location.href).toBe(listHref));
  expect(await screen.findByRole("textbox", { name: "搜索友邻或星球" })).toHaveValue("星球");
  expect(screen.getByRole("button", { name: "禾夏" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "清空筛选" }));
  await waitFor(() => expect(router.state.location.href).toBe("/neighbors"));
  expect(screen.getByRole("status")).toHaveTextContent("找到 4 位友邻");
});

test("direct details return to the default list and history forward revisits the detail", async () => {
  const router = await setup("/neighbors/4");
  expect(await screen.findByRole("heading", { level: 1, name: "纳蕾娜" })).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  await userEvent.click(screen.getByRole("link", { name: "返回友邻列表" }));
  await waitFor(() => expect(router.state.location.href).toBe("/neighbors"));
  router.history.back();
  expect(await screen.findByRole("heading", { level: 1, name: "纳蕾娜" })).toBeVisible();
  router.history.forward();
  expect(await screen.findByRole("textbox", { name: "搜索友邻或星球" })).toHaveValue("");
});

test.each(["0", "abc", "01", "9007199254740992", "9999"])(
  "invalid or unknown neighbor %s renders the not-found state",
  async (id) => {
    await setup(`/neighbors/${id}`);
    expect(await screen.findByRole("heading", { name: "没有找到这位友邻" })).toBeVisible();
  },
);

test("a failed resource load can be retried without leaving the page", async () => {
  const router = await setup();
  vi.stubGlobal("fetch", async () => new Response("missing", { status: 404 }));
  const warn = vi.spyOn(console, "error").mockImplementation(() => {});
  await router.invalidate();
  expect(await screen.findByRole("alert")).toHaveTextContent("友邻资料暂时无法加载");
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL) =>
      new Response(
        JSON.stringify(
          (typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url
          ).endsWith("neighbor-images.json")
            ? fixture.mapping
            : fixture.database,
        ),
      ),
  );
  await userEvent.click(screen.getByRole("button", { name: "重新加载" }));
  expect(await screen.findByRole("textbox", { name: "搜索友邻或星球" })).toBeVisible();
  warn.mockRestore();
});
