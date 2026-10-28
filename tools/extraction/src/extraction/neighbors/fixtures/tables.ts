import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { emptyCatalog } from "../../schema.ts";
import { profile } from "../../../profile.ts";
import { decodeBytes } from "../../decode/obb.ts";
import { Tables } from "../../decode/tables.ts";
import type { TableIndex, TextMap } from "../../types.ts";
import type { NeighborExtractionInput } from "../types.ts";

type Cell = number | string | null | { text: string } | { float: number } | { byte: number };
export type FixtureRows = Record<number, Cell[][]>;
const text = (value: string): Cell => ({ text: value });

export function fixtureRows(): FixtureRows {
  const npc = (id: number, name: string, type: string, scale: number): Cell[] => [
    id,
    text(name),
    null,
    `Avatar/NPC2/NPC_${id}`,
    { float: scale },
    type,
  ];
  const star = (id: number): Cell[] => [
    1,
    text("禾夏"),
    1,
    id,
    null,
    id,
    text(`星球${id}`),
    null,
    null,
    null,
    null,
    `Scene/Galaxy${id}`,
    null,
    null,
    null,
    null,
  ];
  const guide = (id: number, body: string, category = "友邻交往"): Cell[] => [
    4,
    id,
    text(category),
    null,
    null,
    null,
    null,
    text("如何邀约友邻同行？"),
    null,
    null,
    1,
    null,
    text(body),
  ];
  return {
    41: [
      npc(1011, "多杰朗", "NpcBig", 117),
      npc(1009, "伊佐奇", "NpcSmall", 65),
      npc(1010, "云果", "NpcMedium", 95),
      npc(1005, "幻雪", "NpcMedium", 95),
      npc(1012, "巴彦", "NpcMedium", 95),
      npc(1016, "卡逻", "NpcMedium", 95),
      npc(90001, "测试NPC", "NpcMedium", 95),
    ],
    630: [star(1011), star(1009), star(1010), star(1005), star(1020), star(90001)],
    668: [
      [1010, 1, 0, 2, text("<i>原始正文\n第二段</i>"), null],
      [1010, 1, text("种子旅行"), 1, 0, "UISprite/Story.png"],
      [1010, 2, text("下一章"), 1, text("尾声"), null],
    ],
    643: [
      [null, 1, "Get_Items_Num_In_Travel", "10", null, 1, 1, "Reaction_Happy", 0],
      [
        1010,
        1,
        "Npc_Get_Items_Num_In_Travel",
        "作物",
        "3",
        1,
        1,
        "Perform_Harvest",
        text("丰收了！"),
      ],
      [1010, 2, "New_Npc", "6", "3", 1, 1, "Reaction_SayHi", text("新朋友")],
    ],
    654: [
      [
        76,
        text("邂逅·虫鸣野趣之屿"),
        ...Array<Cell>(14).fill(null),
        10001010,
        ...Array<Cell>(10).fill(null),
        "UISprite/Island.png",
      ],
      [77, text("普通岛屿"), ...Array(14).fill(null), 7700],
    ],
    704: [
      [2, "超过5次对NPC邀约"],
      [1, "玩家当天给NPC送礼"],
    ],
    711: [
      guide(191, "与友邻<color=#be6106>亲密度达到7级</color>后，可以邀约友邻同行。"),
      guide(1009, "[test]暂未投放此游戏"),
      guide(299, "友邻功能提及", "社交功能"),
    ],
    180: [
      [
        5,
        text("听丰年创想卡集"),
        null,
        text("完成云果的日常友邻事件\n完成云果的装修请求"),
        "UISprite/Bag.png",
        null,
        null,
        null,
        null,
        null,
        "UI/Recipe/BgThemeTingFengNian",
        "UISprite/Cover.png",
      ],
      [99, text("其他主题"), null, text("摇树获得")],
    ],
    206: [
      [
        1,
        null,
        null,
        null,
        null,
        null,
        "CommonTemplate_FriendStar.json",
        "Entity/NeighborHub/Desk",
      ],
      [2, null, null, null, null, null, null, "Entity/NeighborHub/Desk"],
      [3, null, null, null, null, null, null, "Entity/NPCBldg/House"],
      [4, null, null, null, null, null, null, "Entity/NeighborHub/test_placeholder"],
    ],
  };
}

function encodedTables(rows: FixtureRows): {
  bytes: Buffer;
  indexes: TableIndex[];
  textmap: TextMap;
} {
  const bytes = Buffer.alloc(100_000);
  let cursor = 4;
  let hash = 1000;
  const byHash: TextMap["byHash"] = {};
  const structural = (position: number, value: number) =>
    bytes.writeUInt32BE((value ^ profile.wordMask) >>> 0, position);
  const short = (position: number, value: number) =>
    bytes.writeUInt16BE(value ^ profile.shortMask, position);
  const scalar = (position: number, value: number, kind: "uint" | "float" | "byte") => {
    const plain = Buffer.alloc(kind === "byte" ? 1 : 4);
    if (kind === "float") plain.writeFloatLE(value);
    else if (kind === "byte") plain.writeUInt8(value);
    else plain.writeUInt32LE(value);
    decodeBytes(plain).copy(bytes, position);
  };
  const indexes: TableIndex[] = [];
  for (const [root, records] of Object.entries(rows)) {
    const vector = cursor;
    structural(cursor, records.length);
    cursor += 4 + 4 * records.length;
    indexes.push({ field: Number(root), vector, count: records.length });
    for (const [index, record] of records.entries()) {
      const vtable = cursor;
      const length = 4 + 2 * record.length;
      cursor += length;
      const row = cursor;
      cursor += 4;
      structural(vector + 4 + index * 4, row - (vector + 4 + index * 4));
      structural(row, row - vtable);
      const positions: (number | null)[] = [];
      for (const [field, cell] of record.entries()) {
        if (cell === null) {
          short(vtable + 4 + field * 2, 0);
          positions.push(null);
          continue;
        }
        short(vtable + 4 + field * 2, cursor - row);
        positions.push(cursor);
        cursor += typeof cell === "object" && "byte" in cell ? 1 : 4;
      }
      short(vtable, length);
      short(vtable + 2, cursor - row);
      for (const [field, cell] of record.entries()) {
        const position = positions[field];
        if (cell === null || position == null) continue;
        if (typeof cell === "number") scalar(position, cell, "uint");
        else if (typeof cell === "string") {
          const plain = Buffer.from(cell);
          structural(position, cursor - position);
          structural(cursor, plain.length);
          cursor += 4;
          decodeBytes(plain).copy(bytes, cursor);
          cursor += plain.length;
        } else if ("float" in cell) scalar(position, cell.float, "float");
        else if ("byte" in cell) scalar(position, cell.byte, "byte");
        else {
          byHash[hash] = { nameZh: cell.text, nameEn: null, rowOffset: row, index: hash };
          scalar(position, hash++, "uint");
        }
      }
    }
  }
  return { bytes: bytes.subarray(0, cursor), indexes, textmap: { byHash } };
}

export function createFixture(rows = fixtureRows()): {
  directory: string;
  input: NeighborExtractionInput;
  cleanup: () => void;
} {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-neighbors-"));
  const { bytes, indexes, textmap } = encodedTables(rows);
  fs.writeFileSync(path.join(directory, "ed.obb"), bytes);
  fs.writeFileSync(path.join(directory, "obb-table-index.json"), JSON.stringify(indexes));
  fs.writeFileSync(path.join(directory, "textmap-zh-en.json"), JSON.stringify(textmap));
  fs.writeFileSync(
    path.join(directory, "active-config-source.json"),
    JSON.stringify({
      dataRevision: profile.dataRevision,
      files: [{ file: "ed.obb", matchesManifest: true }],
    }),
  );
  const source = { gameVersion: "fixture", dataRevision: 1, resourceRevision: 1, manifestId: "1" };
  const content = emptyCatalog(source);
  content.items.push({
    id: 1128,
    name: "小方凳",
    image: null,
    description: null,
    quality: 0,
    encyclopediaEntry: null,
    category: "furniture",
    kind: "item",
    subcategory: null,
    attributes: { type: null, size: null, colors: null, materials: null, sources: "完成友邻事件" },
  });
  return {
    directory,
    input: { tables: new Tables(directory), content, source, assetIndex: [] },
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}
