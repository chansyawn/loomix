import { createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { omnidexListPath, omnidexOrigin, omnidexReturnLocation } from "./entry-location";
function setup(href: string) {
  const history = createMemoryHistory({ initialEntries: [href] }),
    router = createRouter({ history, routeTree: createRootRoute() });
  return { history, location: () => router.parseLocation(history.location) };
}
test.each(["catalog", "furniture", "clothing", "creatures", "plants", "dishes", "miscellaneous"])(
  "%s列表来源跨详情保留，历史返回恢复原筛选",
  (segment) => {
    const { history, location } = setup(`/${segment}?q=保留筛选#results`),
      initial = location(),
      origin = omnidexOrigin(initial);
    history.push("/catalog/1", { omnidexOrigin: origin });
    expect(location().pathname).toBe("/catalog/1");
    expect(omnidexOrigin(location())).toEqual(origin);
    history.push("/catalog/2", { omnidexOrigin: omnidexOrigin(location()) });
    const retained = omnidexOrigin(location())!;
    history.go(retained.index - location().state.__TSR_index);
    expect(location().href).toBe(initial.href);
    expect(location().state.__TSR_key).toBe(initial.state.__TSR_key);
  },
);
test("直接访问没有来源，拒绝外部地址、详情地址和无效历史索引", () => {
  const { location } = setup("/catalog/1"),
    current = location();
  expect(omnidexOrigin(current)).toBeUndefined();
  for (const origin of [
    { href: "https://example.com/catalog", index: 0 },
    { href: "/catalog/2", index: 0 },
    { href: "/catalog", index: -1 },
    { href: "/catalog", index: 999 },
  ])
    expect(
      omnidexOrigin({ ...current, state: { ...current.state, omnidexOrigin: origin } }),
    ).toBeUndefined();
  expect(omnidexListPath("/catalog?q=x")).toBe("/catalog");
  expect(omnidexListPath("/collections/all")).toBeUndefined();
  expect(omnidexReturnLocation(undefined)).toEqual({ to: "/catalog", search: {}, hash: "" });
  expect(omnidexReturnLocation({ href: "/plants?q=番茄#results", index: 0 })).toEqual({
    to: "/plants",
    search: { q: "番茄" },
    hash: "results",
  });
});
