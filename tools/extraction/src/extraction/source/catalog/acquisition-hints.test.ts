import { expect, test } from "vite-plus/test";
import type { TableRow } from "../../types.ts";
import { verifyAcquisitionHints } from "../../../verify/acquisition-hints.ts";
import { Tables } from "../decode/tables.ts";
import { acquisitionHintsSchema, readAcquisitionHints } from "./acquisition-hints.ts";
import { uiSignature } from "./context.ts";

interface FixtureRow extends TableRow {
  values: Record<number, number | string | number[]>;
}

const rows: FixtureRow[] = [
  { root: 325, rowOffset: 1, values: { 0: 10, 2: [156, 999, 156] } },
  { root: 325, rowOffset: 2, values: { 0: 10, 2: [] } },
  { root: 325, rowOffset: 3, values: { 0: 20 } },
  { root: 618, rowOffset: 4, values: { 0: 156, 1: 123, 2: "UI跳转", 3: 1, 4: 9, 5: 8 } },
  { root: 618, rowOffset: 5, values: { 0: 100, 1: 456, 2: "", 4: 9 } },
  { root: 618, rowOffset: 6, values: { 0: 101 } },
];

function fixtureTables(): Tables {
  return Object.assign(Object.create(Tables.prototype) as Tables, {
    rows: (root: number) => rows.filter((row) => row.root === root),
    uint: (row: FixtureRow, field: number, fallback: number | null = null) => {
      const value = row.values[field];
      return typeof value === "number" ? value : fallback;
    },
    string: (row: FixtureRow, field: number) => {
      const value = row.values[field];
      return typeof value === "string" ? value : null;
    },
    vector: (row: FixtureRow, field: number) => {
      const value = row.values[field];
      return Array.isArray(value) ? value : null;
    },
    textmap: { 123: { rowOffset: 7, nameZh: "创想卡", nameEn: null } },
  });
}

test("调查保留原行、缺省值及未解析的引用", () => {
  const tables = fixtureTables();
  const records = acquisitionHintsSchema.parse(readAcquisitionHints(tables));
  expect(records.displayRows.map(({ id, sourceIds }) => [id, sourceIds])).toEqual([
    [10, [156, 999, 156]],
    [10, []],
    [20, null],
  ]);
  expect(records.hintRows).toMatchObject([
    {
      sourceId: 156,
      textKey: 123,
      label: "创想卡",
      actionText: "UI跳转",
      actionCode: 1,
      systemJump: 9,
      openStateCfgId: 8,
    },
    {
      sourceId: 100,
      textKey: 456,
      label: null,
      actionText: "",
      systemJump: 9,
      openStateCfgId: null,
    },
    { sourceId: 101, textKey: null, label: null, actionText: null },
  ]);
  expect(records.hintRows[0]!.sources[1]).toMatchObject({ table: 1, row: 123, rowOffset: 7 });
  expect(() => verifyAcquisitionHints(records, tables)).not.toThrow();
  records.hintRows[0]!.openStateCfgId = 9;
  expect(() => verifyAcquisitionHints(records, tables)).toThrow("Acquisition hint fields 156");
});

test("正式显示行的去重只比较正式使用的字段", () => {
  const tables = fixtureTables();
  const signature = uiSignature(tables);
  expect(tables.byId(325, signature).size).toBe(2);
  const [first, second] = tables.rows(325);
  const changed: FixtureRow = { ...second!, values: { 0: 10, 15: 3 } };
  expect(signature(first!)).not.toEqual(signature(changed));
});
