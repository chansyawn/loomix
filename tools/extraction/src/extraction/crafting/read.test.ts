import { expect, test } from "vite-plus/test";
import { createFixture, type FixtureRows } from "../neighbors/fixtures/tables.ts";
import { readCraftingRecipes } from "./read.ts";
const rows = (): FixtureRows => ({
  318: [
    [100, { text: "创想卡" }, 19],
    [200, { text: "家具" }, 1],
    [300, { text: "木材" }, 1],
  ],
  568: [
    [100, 200, 2, null, null, null, null, null, null, null, null, null, 300, 5],
    [101, 200, 1],
  ],
});
function read(data: FixtureRows, finished: (cleanup: () => void) => void, ids = [200]) {
  const fixture = createFixture(data);
  finished(fixture.cleanup);
  return readCraftingRecipes({ tables: fixture.input.tables }, new Set(ids));
}
test("仅保留正式产物需要的有效制作配方，不准入卡片或材料", ({ onTestFinished }) => {
  const data = read(rows(), onTestFinished);
  expect(data.recipes).toEqual([
    {
      id: 100,
      productId: 200,
      quantity: 2,
      materials: [{ itemId: 300, quantity: 5 }],
      unresolvedReason: null,
    },
  ]);
  expect(data.audit.find((row) => row.id === 101)?.disposition).toBe("orphan_card");
  expect(data).not.toHaveProperty("cards");
  expect(data).not.toHaveProperty("imageReferences");
  expect(read(rows(), onTestFinished, []).recipes).toEqual([]);
});
test("空材料保持未知，不完整、重复和不存在的材料拒绝交付", ({ onTestFinished }) => {
  const empty = rows();
  empty[568][0][12] = null;
  empty[568][0][13] = null;
  expect(read(empty, onTestFinished).recipes[0]).toMatchObject({
    materials: null,
    unresolvedReason: "material_slots_absent_semantics_unconfirmed",
  });
  for (const kind of ["missing", "duplicate", "unknown"]) {
    const invalid = rows();
    if (kind === "missing") invalid[568][0][13] = null;
    if (kind === "duplicate") invalid[568][0].push(300, 1);
    if (kind === "unknown") invalid[568][0][12] = 900;
    expect(() => read(invalid, onTestFinished)).toThrow(/crafting material/);
  }
});
