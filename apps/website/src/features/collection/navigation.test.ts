import { createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { collectionOrigin, collectionListPath } from "./navigation";
function setup(href: string) {
  const history = createMemoryHistory({ initialEntries: [href] }),
    router = createRouter({ history, routeTree: createRootRoute() });
  return { history, location: () => router.parseLocation(history.location) };
}
test.each(["all", "furniture", "clothing", "creatures", "plants", "dishes", "miscellany"])(
  "%s列表来源跨详情保留，历史返回恢复原筛选",
  (segment) => {
    const { history, location } = setup(`/collections/${segment}?q=保留筛选`),
      initial = location(),
      origin = collectionOrigin(initial);
    history.push("/collections/records/1", { collectionOrigin: origin });
    expect(location().pathname).toBe("/collections/records/1");
    expect(collectionOrigin(location())).toEqual(origin);
    history.push("/collections/records/2", { collectionOrigin: collectionOrigin(location()) });
    const retained = collectionOrigin(location())!;
    history.go(retained.index - location().state.__TSR_index);
    expect(location().href).toBe(initial.href);
    expect(location().state.__TSR_key).toBe(initial.state.__TSR_key);
  },
);
test("直接访问没有来源，拒绝外部地址、详情地址和无效历史索引", () => {
  const { location } = setup("/collections/records/1"),
    current = location();
  expect(collectionOrigin(current)).toBeUndefined();
  for (const origin of [
    { href: "https://example.com/collections/all", index: 0 },
    { href: "/collections/records/2", index: 0 },
    { href: "/collections/all", index: -1 },
    { href: "/collections/all", index: 999 },
  ])
    expect(
      collectionOrigin({ ...current, state: { ...current.state, collectionOrigin: origin } }),
    ).toBeUndefined();
  expect(collectionListPath("/collections/all?q=x")).toBe("/collections/all");
});
