import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { validateWebsiteResources } from "../src/website-resources.ts";
import { writeFixture, writeDocuments } from "./fixture.ts";
import { neighbor } from "../../../packages/schema/tests/fixture.ts";
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("友邻与目录共享同一资源目录，并校验完整引用图", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-neighbor-release-"));
  directories.push(directory);
  const { dataset, imageIndex } = await writeFixture(directory);
  const image = { assetId: imageIndex.images[0]!.assetId, variant: imageIndex.images[0]!.variant };
  const owner = neighbor(11);
  owner.images.role = image;
  dataset.neighbors.neighbors.push(owner);
  await writeDocuments(directory, dataset, imageIndex);
  const content = await validateWebsiteResources(directory);
  expect(content.imageFiles).toHaveLength(1);
  owner.gifts.love = { itemIds: [999], tagIds: [] };
  await writeDocuments(directory, dataset, imageIndex);
  await expect(validateWebsiteResources(directory)).rejects.toThrow("Unknown item 999");
});
test("rejects undeclared files in nested directories", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-neighbor-release-"));
  directories.push(directory);
  await writeFixture(directory);
  await writeFile(path.join(directory, "zh-CN/extra.json"), "{}");
  await expect(validateWebsiteResources(directory)).rejects.toThrow("exactly the declared");
});
