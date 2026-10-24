import { expect, test } from "vite-plus/test";
import { classify } from "./scope.ts";
import { parseAdmissions } from "./admissions.ts";
import { catalogSource } from "../../profile.ts";
import type { SupplementalAdmissions } from "./admissions.ts";
import type { Row, TableRow } from "../types.ts";

function fixture() {
  const names = new Map([
    [1, "图鉴植物"],
    [2, "苹果"],
    [3, "未核验食物"],
  ]);
  const rows = [{ root: 93, rowOffset: 1 }];
  const main = new Map([...names.keys()].map((id) => [id, { root: 318, rowOffset: id }]));
  const tables = {
    rows: () => rows,
    id: (row: TableRow) => row.rowOffset,
    uint: (_row: Row, _field: number) => 0,
    byte: () => 0,
    text: (row: Row) => (row ? (names.get(row.rowOffset) ?? null) : null),
  };
  const vocabulary = {
    tags: () => ["采摘"],
    tree: {},
    renderTags: () => "采摘材料",
    setTags: {},
    subgroups: [{ id: 304, group: 2, name: "采摘材料", filters: ["采摘"] }],
    groupNames: { 2: "plants.item" as const },
  };
  const data: SupplementalAdmissions = {
    schemaVersion: 1,
    source: { ...catalogSource },
    confirmation: { kind: "manual", note: "用户确认已实装及指定分类" },
    entries: [{ id: 2, expectedName: "苹果", category: "plants", subcategory: "采摘材料" }],
  };
  const admissions = () => parseAdmissions(Buffer.from(JSON.stringify(data)));
  return {
    data,
    main,
    names,
    rows,
    admissions,
    run: () => classify(tables, vocabulary, main, admissions()),
  };
}
test("admission is encyclopedia union confirmed IDs, never all named main items", () => {
  const f = fixture();
  const scope = f.run();
  expect([...scope.ids]).toEqual([1, 2]);
  expect(scope.ids.has(3)).toBe(false);
  expect(scope.groups.get(2)).toBe("plants.item");
  expect(scope.categories.get(2)).toBe("采摘材料");
  expect(scope.admissionEvidence[1]).toEqual({
    id: 2,
    admissionSources: [
      {
        kind: "manual",
        file: "supplemental-admissions.json",
        pointer: "/entries/0",
        sha256: f.admissions().sha256,
      },
    ],
    encyclopedia: { state: "absent", file: "prepared/ed.obb", table: 93 },
  });
});
test("overlapping admission yields one record and preserves both sources", () => {
  const f = fixture();
  f.data.entries = [{ ...f.data.entries[0], id: 1, expectedName: "图鉴植物" }];
  const scope = f.run();
  expect([...scope.ids]).toEqual([1]);
  expect(scope.admissionEvidence[0].admissionSources.map((s) => s.kind)).toEqual([
    "encyclopedia",
    "manual",
  ]);
  expect(scope.admissionEvidence[0].encyclopedia).toMatchObject({ state: "present", listed: true });
});
test.each(["category", "subcategory"])("rejects overlapping %s conflicts", (field) => {
  const f = fixture();
  f.data.entries = [{ ...f.data.entries[0], id: 1, expectedName: "图鉴植物" }];
  Object.assign(f.data.entries[0], { [field]: field === "category" ? "miscellaneous" : "作物" });
  expect(f.run).toThrow(/classification conflict/);
});
test("rejects missing main identity and expected name mismatch", () => {
  const f = fixture();
  f.names.set(2, "新名称");
  expect(f.run).toThrow(/name mismatch/);
  f.main.delete(2);
  expect(f.run).toThrow(/No main item/);
});
test("rejects mismatched versions and duplicate supplemental IDs", () => {
  const f = fixture();
  f.data.source.dataRevision++;
  expect(f.admissions).toThrow(/version mismatch/);
  f.data.source = { ...catalogSource };
  f.data.entries.push({ ...f.data.entries[0] });
  expect(f.admissions).toThrow(/Duplicate supplemental ID/);
});
test("frozen confirmation bytes determine identity even when only rationale changes", () => {
  const f = fixture();
  const before = f.admissions().sha256;
  f.data.confirmation.note += "，再次核验";
  expect(f.admissions().sha256).not.toBe(before);
});
