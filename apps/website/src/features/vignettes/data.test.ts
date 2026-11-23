import { isNotFound } from "@tanstack/react-router";
import { expect, test, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../omnidex-fixture";
import { loadVignetteDetail, loadVignetteList } from "./data";

const requestUrl = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : input.toString();

test("小栖地列表只读取清单、模板与图片", async () => {
  const request = vi.fn(fixtureRequest(catalogFixture()));
  await expect(loadVignetteList(request)).resolves.toEqual([]);
  expect(request.mock.calls.map(([input]) => requestUrl(input).split("/").at(-1))).toEqual(
    expect.arrayContaining(["image-index.json", "resource-manifest.json", "vignettes.json"]),
  );
  expect(request).toHaveBeenCalledTimes(3);
});

test("非法及未收录的小栖地进入未找到状态", async () => {
  const request = vi.fn(fixtureRequest(catalogFixture()));
  await expect(loadVignetteDetail("01", request)).rejects.toSatisfy(isNotFound);
  expect(request).not.toHaveBeenCalled();
  await expect(loadVignetteDetail("1", request)).rejects.toSatisfy(isNotFound);
  expect(request.mock.calls.map(([input]) => requestUrl(input).split("/").at(-1))).toEqual(
    expect.arrayContaining([
      "image-index.json",
      "catalog.json",
      "gameplay-tags.json",
      "neighbors.json",
      "resource-manifest.json",
      "vignettes.json",
    ]),
  );
  expect(request).toHaveBeenCalledTimes(6);
});

test("小栖地文档字节与清单不符时拒绝加载", async () => {
  const original = fixtureRequest(catalogFixture());
  const request: typeof fetch = (input, init) =>
    requestUrl(input).endsWith("vignettes.json")
      ? Promise.resolve(new Response("{}"))
      : original(input, init);
  await expect(loadVignetteList(request)).rejects.toThrow("Resource integrity mismatch: vignettes");
});
