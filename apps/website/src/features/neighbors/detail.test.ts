import { expect, test, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../omnidex-fixture";
import { loadNeighborDetail } from "./detail";
import { neighborFixture } from "./fixture";

test("地点按需独立读取，一侧失败后可重试且沿用同一份清单", async () => {
  const { database: neighbors, gameplayTags } = neighborFixture();
  const { catalog } = catalogFixture();
  const fetchFixture = fixtureRequest({ neighbors, catalog, gameplayTags });
  const paths: string[] = [];
  const request = vi.fn<typeof fetch>(async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    const file = url.split("/").at(-1)!;
    paths.push(file);
    if (file === "starsea.json" && paths.filter((path) => path === file).length === 1)
      return new Response(null, { status: 503 });
    return fetchFixture(input);
  });
  const detail = await loadNeighborDetail("1", request);
  expect(detail.neighbor.name).toBe("蛮蛮");
  expect(paths).not.toContain("vignettes.json");
  expect(paths).not.toContain("starsea.json");
  const [islets, vignettes] = await Promise.allSettled([
    detail.readIslets(),
    detail.readVignettes(),
  ]);
  expect(islets.status).toBe("rejected");
  expect(vignettes).toEqual({ status: "fulfilled", value: [] });
  await expect(detail.readIslets()).resolves.toEqual({ islets: [], unconfirmedRegions: [] });
  expect(paths.filter((path) => path === "resource-manifest.json")).toHaveLength(1);
});
