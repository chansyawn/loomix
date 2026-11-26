import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { expect, test } from "vite-plus/test";
import type { TableRow } from "../../types.ts";
import { createFixture } from "../neighbors/fixtures/tables.ts";
import { readAppearanceAdmissions } from "./appearance.ts";
import { splitTags } from "./model.ts";

test("只纳入有三测获取入口的外观，保留重复入口、同组奖励和原始图鉴状态", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [
      [601, null, null, null, null, null, "短发"],
      [602, null, null, null, null, null, "眼睛"],
      [603, null, null, null, null, null, "发型"],
      [604, null, null, null, null, null, "肤色"],
      [605, null, null, null, null, null, "面饰"],
      [60673, null, null, null, null, null, "面饰"],
    ],
    93: [
      [603, { byte: 1 }],
      [605, { byte: 0 }],
      [60673, { byte: 1 }],
    ],
    113: [
      [21, null, null, 601, 1],
      [22, null, null, 602],
      [23, null, null, 603],
      [24, null, null, 604, 1],
      [25, null, null, null, 1],
    ],
    659: [
      [1001, 10, 21],
      [8201, 82, 23],
      [8202, 82, 605],
    ],
    267: [[300001, null, null, null, null, null, null, 10001]],
    269: [
      [10001, null, null, null, 22, null, null, null, null, null, null, null, null, 602],
      [10001, null, null, null, 24, null, null, null, null, null, null, null, null, 604],
    ],
    153: [[160007]],
    154: [
      [160007, 605],
      [160007, 60673],
    ],
  });
  onTestFinished(fixture.cleanup);
  const { tables } = fixture.input;
  const tagIndex = createGameplayTagIndex([
    { id: 1, internalName: "发型", parentId: null, displayName: "发型" },
    { id: 2, internalName: "短发", parentId: 1, displayName: "短发" },
    { id: 3, internalName: "面饰", parentId: null, displayName: "面部饰品" },
  ]);
  const vocabulary = {
    tags: (row: TableRow, field: number) => splitTags(tables.string(row, field)),
    tagIndex,
    renderTags: ([name]: string[]) => tagIndex.findByName(name!)?.displayName ?? null,
  };
  const encyclopedia = new Map(tables.rows(93).map((row) => [tables.id(row), row]));
  const result = readAppearanceAdmissions(tables, tables.byId(318), encyclopedia, vocabulary);
  expect([...result.admitted.keys()]).toEqual([601, 602, 604, 60673]);
  expect(result.admitted.get(601)?.sources.map(({ kind }) => kind)).toEqual([
    "initial",
    "televisionShop",
  ]);
  expect(result.admitted.get(602)?.sources[0]?.rows.map(({ table }) => table)).toEqual([
    267, 269, 113,
  ]);
  expect(result.admitted.get(604)?.sources.map(({ kind }) => kind)).toEqual(["initial", "gacha"]);
  expect(result.admitted.get(60673)?.category).toBe("面部饰品");
  expect(result.investigation).toEqual([
    expect.objectContaining({
      id: 603,
      reason: "unconfirmed_shop_group",
      encyclopedia: expect.objectContaining({ state: "present", listed: false }),
      rows: [expect.objectContaining({ table: 659 }), expect.objectContaining({ table: 113 })],
    }),
  ]);
});
