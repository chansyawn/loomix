import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import { validateContent } from "../src/validate.ts";
import { writeFixture, writeDocuments } from "./fixture.ts";
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("world and catalog share one asset directory with complete graph validation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-world-release-"));
  directories.push(directory);
  const { dataset, assets } = await writeFixture(directory);
  const image = { assetId: assets.images[0].assetId, variant: assets.images[0].variant };
  dataset.world.islandIconStyles.push({
    id: 1,
    name: "岛屿图标",
    icon: image,
    variantIcon: image,
    entityPrefabPath: "Island/1",
  });
  dataset.world.islands.push({
    id: 1,
    name: "岛屿",
    sceneId: 10,
    status: "default",
    galaxyId: null,
    regionId: null,
    iconStyleId: 1,
    image,
    displayCreatureIds: [],
    displaySpecialtyIds: [1],
    neighborIds: [],
    unlockCondition: null,
  });
  await writeDocuments(directory, dataset, assets);
  const content = await validateContent(directory);
  expect(content.assets).toHaveLength(1);
  expect(content.release.dataset.world.islands).toHaveLength(1);
  dataset.world.islands[0].displayCreatureIds = [1];
  await writeDocuments(directory, dataset, assets);
  await expect(validateContent(directory)).rejects.toThrow("Unknown island item");
});
test("rejects undeclared files in nested directories", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-world-release-"));
  directories.push(directory);
  await writeFixture(directory);
  await writeFile(path.join(directory, "zh-CN/extra.json"), "{}");
  await expect(validateContent(directory)).rejects.toThrow("exactly the declared");
});
