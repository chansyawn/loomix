import { expect, test } from "vite-plus/test";
import { clientReadRecordsFixture } from "../fixtures/client-read-records.ts";
import { emptyFlowerHybridization } from "../fixtures/flower-hybridization.ts";
import { assemble } from "../assemble/index.ts";
import { imageCollector } from "../source/images.ts";
import { createFixture } from "../source/neighbors/fixtures/tables.ts";
import { verifyClientIconSources } from "../../verify/client-icons.ts";
import { clientIconAtlas, clientIconResolver } from "./resolve.ts";
import { readClientIcons } from "./read.ts";
import type { IndexedAsset } from "../types.ts";

const reference = "UISprite/Load/GalleryHandbook/CreatureHabit_NoRainy";
const source = "PetitPlanet_Data/Persistent/AssetBundle/test.blk";
const asset: IndexedAsset = {
  Type: "Sprite",
  Name: "CreatureHabit_NoRainy",
  Container: clientIconAtlas(reference)!,
  PathID: "-7",
  Source: source,
};
const baseSource = source.replace("Persistent", "StreamingAssets");
const packages = new Map([
  [source, "a".repeat(64)],
  [baseSource, "b".repeat(64)],
]);

test("按图集成员和覆盖包选择习性原图，拒绝歧义及范围外的同名对象", () => {
  const index = [{ ...asset, Source: baseSource }, asset];
  const images = imageCollector(index, packages);
  const resolve = clientIconResolver(index, images.locate);
  const icon = resolve(reference);
  expect(icon.method).toBe("configured_atlas_member");
  expect(images.objects).toMatchObject([{ key: icon.object, source, pathId: "-7" }]);
  expect(resolve(reference)).toEqual(icon);
  expect(images.objects).toHaveLength(1);
  expect(() => resolve(reference.replace("GalleryHandbook", "Other"))).toThrow("Unresolved");
  const ambiguous = [...index, { ...asset, PathID: "-8" }];
  expect(() =>
    clientIconResolver(ambiguous, imageCollector(ambiguous, packages).locate)(reference),
  ).toThrow("Unresolved");
});

test("保留页签复合键、复用及空槽位，独立验收拒绝串换和遗漏", ({ onTestFinished }) => {
  const tab = (group: number, id: number) => [
    group,
    null,
    { text: "组" },
    id,
    { text: "分类" },
    null,
    null,
    null,
    8,
    reference,
  ];
  const fixture = createFixture({
    33: [tab(1, 101), tab(2, 101)],
    70: [],
    86: [],
    121: [],
    122: [],
    126: [],
    134: [[5, { text: "雨天出没" }, reference]],
    265: [[1, null, { text: "起居" }, null, { text: "床" }, "单人床", reference, null]],
    325: [],
    337: [
      [1, null, { text: "喜爱" }],
      [2, null, { text: "好感" }],
      [4, null, { text: "反感" }],
      [100, null, { text: "关于" }],
    ],
  });
  onTestFinished(fixture.cleanup);
  const tables = fixture.input.tables;
  const images = imageCollector([asset], packages);
  const icons = readClientIcons(tables, new Map(), clientIconResolver([asset], images.locate));
  expect(icons.omnidexTabs.map((tab) => [tab.groupId, tab.id])).toEqual([
    [1, 101],
    [2, 101],
  ]);
  expect(icons.furnitureCategories[0]?.subcategoryIcon.image).toBeNull();
  expect(images.objects).toHaveLength(1);
  const observations = clientReadRecordsFixture();
  observations.clientIcons = icons;
  observations.imageObjects = images.objects;
  const original = {
    object: images.objects[0]!.key,
    file: "originals/example.png",
    width: 40,
    height: 40,
    sha256: "c".repeat(64),
  };
  const assembleFixture = (originals: (typeof original)[]) =>
    assemble(observations, originals, emptyFlowerHybridization(observations.source));
  expect(() => assembleFixture([])).toThrow("Missing client icon original");
  const result = assembleFixture([original]);
  expect(result.imageJobs).toEqual([]);
  expect(result.imageBindings).toEqual([]);
  verifyClientIconSources(icons, result.dataset.catalog, tables);
  const changed = structuredClone(icons);
  changed.habits[0]!.icon.field = 1;
  expect(() => verifyClientIconSources(changed, result.dataset.catalog, tables)).toThrow();
  icons.omnidexTabs.pop();
  expect(() => verifyClientIconSources(icons, result.dataset.catalog, tables)).toThrow();
});

test("厨具按配方对应的小图取材，保留无匹配厨具的菜肴", ({ onTestFinished }) => {
  const recipe = (id: number, code: number) => [
    id,
    null,
    1,
    null,
    id + 100,
    null,
    "10;11",
    ...Array<null>(9).fill(null),
    code,
  ];
  const fixture = createFixture({
    33: [],
    70: [],
    86: [],
    121: [],
    122: [recipe(1, 2), recipe(2, 1)],
    126: [[2000021, "煮锅", 2]],
    134: [],
    265: [],
    325: [[2000021, null, null, null, "UISprite/Pot_s", "UISprite/Pot_b"]],
    337: [],
  });
  onTestFinished(fixture.cleanup);
  const tables = fixture.input.tables;
  const recipes = new Map(tables.rows(122).map((row) => [tables.uint(row, 4)!, row]));
  const icons = readClientIcons(tables, recipes, (ref) => ({
    reference: ref,
    object: "a".repeat(64),
    method: "exact_config_path",
  }));
  expect(icons.cookware[0]?.icon).toMatchObject({
    table: 325,
    field: 4,
    image: { reference: "UISprite/Pot_s" },
  });
  expect(icons.dishes).toMatchObject([
    { id: 101, cookwareId: 2000021, effectIds: [10, 11] },
    { id: 102, cookwareId: null },
  ]);
  expect(() =>
    readClientIcons(tables, recipes, () => {
      throw new Error("missing");
    }),
  ).toThrow(/325:2000021.*Pot_s/);
});
