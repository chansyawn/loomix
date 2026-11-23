import { expect, test } from "vite-plus/test";
import { createFixture, type FixtureRows } from "../../neighbors/fixtures/tables.ts";
import { readCraftingRecipes } from "./read.ts";
const rows = (): FixtureRows => ({
  180: [],
  318: [
    [100, { text: "创想卡" }, 19],
    [102, { text: "没有配方的创想卡" }, 19],
    [200, { text: "家具" }, 1],
    [300, { text: "木材" }, 1],
  ],
  568: [
    [100, 200, 1, null, null, null, null, null, null, null, null, null, 300, 5],
    [101, 200, 1],
  ],
});
function read(data: FixtureRows, finished: (cleanup: () => void) => void, ids = [200]) {
  const fixture = createFixture(data);
  finished(fixture.cleanup);
  return readCraftingRecipes({ tables: fixture.input.tables }, new Set(ids));
}
test("仅收录正式家具关联的有效创想卡，记录排除原因", ({ onTestFinished }) => {
  const data = read(rows(), onTestFinished);
  expect(data.recipes).toMatchObject([
    { id: 100, productId: 200, cardSetId: null, materials: [{ itemId: 300, quantity: 5 }] },
  ]);
  expect(data.audit.find((row) => row.id === 101)?.disposition).toBe("orphan_card");
  expect(data.audit.find((row) => row.id === 102)?.disposition).toBe("no_recipe");
  const excluded = read(rows(), onTestFinished, []);
  expect(excluded.recipes).toEqual([]);
  expect(excluded.audit.find((row) => row.id === 100)?.disposition).toBe("outside_scope");
});
test("产量缺失或非一件时暂停收录", ({ onTestFinished }) => {
  for (const quantity of [null, 2]) {
    const invalid = rows();
    invalid[568][0][2] = quantity;
    expect(() => read(invalid, onTestFinished)).toThrow(
      "Unsupported crafting product quantity 100",
    );
  }
});
test("空材料保持未知，并拒绝不完整、重复和不存在的材料", ({ onTestFinished }) => {
  const empty = rows();
  empty[568][0][12] = null;
  empty[568][0][13] = null;
  expect(read(empty, onTestFinished).recipes[0]).toMatchObject({ materials: null });
  for (const kind of ["missing", "duplicate", "unknown"]) {
    const invalid = rows();
    if (kind === "missing") invalid[568][0][13] = null;
    if (kind === "duplicate") invalid[568][0].push(300, 1);
    if (kind === "unknown") invalid[568][0][12] = 900;
    expect(() => read(invalid, onTestFinished)).toThrow(/crafting material/);
  }
});
