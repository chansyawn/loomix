import { expect, test } from "vite-plus/test";
import { profile } from "../../profile.ts";
import { createFixture } from "../source/neighbors/fixtures/tables.ts";
import { imageCollector } from "../source/images.ts";
import type { IndexedAsset } from "../types.ts";
import { assembleNeighborImages, neighborImageSlots } from "./model.ts";
import { readNeighborImages } from "./read.ts";
import { imageFolders, neighborSprites } from "./sprites.ts";

const source = "PetitPlanet_Data/StreamingAssets/test.blk";
const overlay = "PetitPlanet_Data/Persistent/test.blk";
const packages = new Map([
  [source, "a".repeat(64)],
  [overlay, "b".repeat(64)],
]);
function sprite(name: string, location: string, id: number): IndexedAsset {
  const relative = location.endsWith(".png") ? location : `${location}/${name}.png`;
  return {
    Name: name,
    Container: profile.assetPrefix + relative.toLowerCase(),
    Source: source,
    PathID: String(id),
    Type: "Sprite",
  };
}

test("星湾日记按目录、成员名和准入 ID 归属，优先使用唯一补丁对象", () => {
  const decor = sprite("Img_StarBay_Diary_0011Manman_001", imageFolders.atlas, 10);
  const patch = { ...decor, Source: overlay, PathID: "20" };
  const page = sprite("Img_Starbay_Diary_Book_0011_02", imageFolders.diary, 11);
  const spine = sprite("spine_starbaydiary_0011", imageFolders.spine, 12);
  const index = [
    page,
    decor,
    patch,
    spine,
    sprite("Img_StarBay_Diary_Player_003", imageFolders.atlas, 30),
    sprite("Img_StarBay_Diary_0000Player_001", imageFolders.atlas, 31),
    sprite("Img_StarBay_Diary_9999Other_001", imageFolders.atlas, 32),
    sprite("Img_StarBay_Diary_0011Manman_002", "another/atlas.png", 33),
    { ...patch, Type: "Texture2D", PathID: "34" },
  ];
  const ids = new Set([11, 1005]);
  const sprites = neighborSprites(index, ids);
  expect(
    sprites.diary(11).map(({ kind, sequence, asset }) => [kind, sequence, asset.PathID]),
  ).toEqual([
    ["decoration", 1, "20"],
    ["page", 2, "11"],
    ["spine", null, "12"],
  ]);
  expect(sprites.diary(1005)).toEqual([]);
  expect(sprites.diary(9999)).toEqual([]);
  expect(() => neighborSprites([...index, { ...patch, PathID: "21" }], ids).diary(11)).toThrow(
    /20.*21/,
  );
});

test("区分图片配置和友邻归属，保留共用物品图标的每个槽位", ({ onTestFinished }) => {
  const owners = [
    { id: 11, nameZh: "蛮蛮" },
    { id: 1005, nameZh: "幻雪" },
    { id: 1015, nameZh: "纳蕾娜" },
  ];
  const items = [29011, 29005, 29008];
  const neighbors = owners.map((owner, index) => ({
    ...owner,
    house: {
      stages: [
        {
          id: 300 + index,
          upgrade: {
            blueprint: { itemId: items[index]!, quantity: 1 },
            materials: [{ itemId: 1, quantity: 1 }],
          },
        },
      ],
    },
  }));
  const avatars = owners.map(({ id }, index) =>
    sprite(`Img_Common_Npc_Avatar${String(id).padStart(4, "0")}`, imageFolders.social, 10 + index),
  );
  const rooms = owners.map(({ id }, index) =>
    sprite(`NPC_decor_${id}`, imageFolders.interior, 20 + index),
  );
  const small = "UISprite/Load/Item/shared_s",
    large = "UISprite/Load/Item/shared_b";
  const index = [
    ...avatars,
    ...rooms,
    sprite("shared_s", imageFolders.item, 30),
    sprite("shared_b", imageFolders.item, 31),
  ];
  const fixture = createFixture({
    547: [[88, null, "UISprite/Load/Social/Img_Common_Npc_Avatar0011"]],
    420: [[11, "UISprite/Load/BigPic/NpcHousePic/NPC_decor_11"]],
    325: items.map((id) => [id, null, null, null, id === 29011 ? large : small, large]),
  });
  onTestFinished(fixture.cleanup);
  const collector = imageCollector(index, packages);
  const records = readNeighborImages(fixture.input.tables, neighbors, index, collector.locate);
  expect(records[0]?.socialAvatar).toMatchObject({
    ownership: "asset-name",
    configuration: [{ table: 547, field: 2 }],
  });
  expect(records[0]?.interior).toMatchObject({
    ownership: "table-relation",
    configuration: [{ table: 420, field: 1 }],
  });
  expect(records[1]?.interior).toMatchObject({ ownership: "asset-name", configuration: [] });
  const [manman, huanxue, naleina] = records.map((record) => record.blueprints[0]!);
  expect(manman!.small.object).toBe(manman!.large.object);
  expect(huanxue!.itemId).not.toBe(naleina!.itemId);
  expect(huanxue!.large.object).toBe(naleina!.large.object);
  expect(huanxue!.small.object).toBe(naleina!.small.object);
  expect(huanxue!.small.configuration[0]?.field).toBe(4);
  expect(huanxue!.large.configuration[0]?.field).toBe(5);
  expect(neighborImageSlots(records)).toHaveLength(12);
  expect(new Set(neighborImageSlots(records).map((slot) => slot.object)).size).toBe(8);
  expect(() => assembleNeighborImages("c".repeat(64), records, [])).toThrow(
    "Missing neighbor image original",
  );
  expect(() =>
    readNeighborImages(
      fixture.input.tables,
      neighbors,
      index.filter((asset) => asset.Name !== "shared_s"),
      collector.locate,
    ),
  ).toThrow("shared_s");
  const wrongRoom = createFixture({
    547: [],
    420: [[11, "UISprite/Load/BigPic/NpcHousePic/NPC_decor_1015"]],
    325: [],
  });
  onTestFinished(wrongRoom.cleanup);
  expect(() =>
    readNeighborImages(wrongRoom.input.tables, neighbors, index, collector.locate),
  ).toThrow("Interior path for neighbor 11");
});
