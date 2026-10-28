import { expect, test, vi } from "vite-plus/test";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseAssets } from "@loomix/schema/assets";
import { catalogFixture, fixtureRequest } from "../features/collection-fixture";
import { createResourceReader } from "./resources";

const url = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : input.toString();

test("a resource reader shares one manifest and uses its injected transport for all documents", async () => {
  const request = vi.fn(fixtureRequest(catalogFixture()));
  const read = createResourceReader(request);
  await Promise.all([read("catalog", parseCatalog), read("assets", parseAssets)]);
  expect(request.mock.calls.filter(([input]) => url(input).endsWith("release.json"))).toHaveLength(
    1,
  );
  expect(request).toHaveBeenCalledTimes(3);
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
