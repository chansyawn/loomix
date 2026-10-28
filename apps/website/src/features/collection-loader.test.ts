import { afterEach, expect, test, vi } from "vite-plus/test";
import { loadCollectionView } from "./collection-loader";
import { catalogFixture, fixtureRequest } from "./collection-fixture";

afterEach(() => vi.unstubAllGlobals());
test("loads manifest-selected documents and keeps confirmed empty collections empty", async () => {
  vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture())));
  const view = await loadCollectionView();
  expect(view.plants.items).toEqual([]);
  expect(view.miscellaneous).toEqual([]);
});
test("rejects failed resource requests", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
  await expect(loadCollectionView()).rejects.toThrow("Unable to load release");
});
