import {
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceManifestSchema,
} from "@loomix/schema/website-resources";
import { expect, test, vi } from "vite-plus/test";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseImageIndex } from "@loomix/schema/assets";
import { parseStarsea } from "@loomix/schema/starsea";
import { catalogFixture, fixtureRequest } from "../features/collection-fixture";
import { createResourceReader } from "./resources";

const url = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : input.toString();

test("a resource reader shares one manifest and uses its injected transport for all documents", async () => {
  const request = vi.fn(fixtureRequest(catalogFixture()));
  const read = createResourceReader(request);
  const [, , starsea] = await Promise.all([
    read("catalog", parseCatalog),
    read("image-index", parseImageIndex),
    read("starsea", parseStarsea),
  ]);
  expect(starsea.regions).toEqual([]);
  expect(
    request.mock.calls.filter(([input]) => url(input).endsWith(WEBSITE_RESOURCE_MANIFEST_FILE)),
  ).toHaveLength(1);
  expect(request).toHaveBeenCalledTimes(4);
});

test("modified document bytes fail before domain parsing", async () => {
  const original = fixtureRequest(catalogFixture());
  const request: typeof fetch = async (input, init) =>
    url(input).endsWith("catalog.json") ? new Response("{}") : original(input, init);
  const parse = vi.fn(parseCatalog);
  await expect(createResourceReader(request)("catalog", parse)).rejects.toThrow(
    "integrity mismatch",
  );
  expect(parse).not.toHaveBeenCalled();
});

test("读取网站资源清单时拒绝旧格式", async () => {
  const original = fixtureRequest(catalogFixture());
  const request: typeof fetch = async (input, init) => {
    const response = await original(input, init);
    if (!url(input).endsWith(WEBSITE_RESOURCE_MANIFEST_FILE)) return response;
    const manifest = WebsiteResourceManifestSchema.parse(await response.json());
    return Response.json({ ...manifest, formatVersion: manifest.formatVersion - 1 });
  };
  await expect(createResourceReader(request)("catalog", parseCatalog)).rejects.toThrow();
});
