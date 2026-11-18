import { isNotFound } from "@tanstack/react-router";
import { expect, test, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture";
import { loadStarseaDetail, loadStarseaList } from "./data";

const requestUrl = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : input.toString();

test("星海列表只读取清单、星海与图片文档", async () => {
  const request = vi.fn(fixtureRequest(catalogFixture()));
  await expect(loadStarseaList(request)).resolves.toEqual({ regions: [], islets: [] });
  const paths = request.mock.calls.map(([input]) => requestUrl(input).split("/").at(-1));
  expect(new Set(paths)).toEqual(new Set(["assets.json", "release.json", "starsea.json"]));
  expect(request).toHaveBeenCalledTimes(3);
});

test("非法详情 ID 不读取资源，未知详情 ID 读取同一清单后进入 404", async () => {
  const request = vi.fn(fixtureRequest(catalogFixture()));
  await expect(loadStarseaDetail("01", request)).rejects.toSatisfy(isNotFound);
  expect(request).not.toHaveBeenCalled();
  await expect(loadStarseaDetail("1", request)).rejects.toSatisfy(isNotFound);
  expect(request).toHaveBeenCalledTimes(5);
  expect(
    request.mock.calls.filter(([input]) => requestUrl(input).endsWith("release.json")),
  ).toHaveLength(1);
});

test("资源读取失败时报告加载错误", async () => {
  const request: typeof fetch = async () => new Response(null, { status: 503 });
  await expect(loadStarseaDetail("1", request)).rejects.toThrow("Unable to load release");
});
