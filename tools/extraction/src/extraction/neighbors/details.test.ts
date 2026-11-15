import { expect, test } from "vite-plus/test";
import { createFixture, fixtureRows } from "./fixtures/tables.ts";
import { extractNeighborBundle } from "./extract.ts";
import { verifyNeighborDetails } from "./verify-details.ts";

function detailsFixture() {
  const rows = fixtureRows();
  rows[641] = [
    [
      1010,
      null,
      null,
      null,
      { text: "捕虫爱好者" },
      null,
      { text: "收获高手" },
      null,
      null,
      null,
      1,
      null,
      2,
      { text: "一起旅行" },
      "Reaction_SuperShy",
    ],
  ];
  rows[222] = [[5, 1010, "UISprite/Watering", { text: "作物浇水" }, { text: "帮忙浇水" }]];
  rows[500]!.find((row) => row[0] === 1010)![2] = 2110056;
  rows[122] = [[2110056, null, null, null, 2010056]];
  rows[315]!.find((row) => row[1] === 1010)![11] = 99;
  rows[377] = [[99, 30050, 10, 10]];
  return createFixture(rows);
}

test("读取资料、能力与住宅，未确认主题和数量不生成关系", ({ onTestFinished }) => {
  const fixture = detailsFixture();
  onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  const neighbor = database.neighbors.find((row) => row.id === 1010)!;
  expect(neighbor.profile).toMatchObject({
    nickname: "闷果儿",
    gender: "female",
    birthday: { month: 9, day: 19 },
  });
  expect(neighbor.travelProfile?.specialties).toEqual([
    { categoryCode: 4, label: "捕虫爱好者" },
    { categoryCode: 6, label: "收获高手" },
  ]);
  expect(neighbor.abilities).toEqual([
    {
      key: "1010:5",
      unlockLevel: 5,
      name: "作物浇水",
      description: "帮忙浇水",
      icon: "UISprite/Watering",
    },
  ]);
  expect(neighbor.signature.cookingRecipeId).toBe(2110056);
  expect(neighbor.house?.stages[0].upgradeRequirements).toBeNull();
  expect(neighbor.design).toEqual({ furnitureSetId: null, craftingCollectionId: null });
  expect(audit.exclusions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ reason: "house_requirement_quantity_semantics_unconfirmed" }),
      expect.objectContaining({ reason: "theme_target_namespace_unconfirmed" }),
    ]),
  );
  expect(audit.records).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fieldPath: "abilities.0.name", status: "confirmed" }),
    ]),
  );
  verifyNeighborDetails(database, fixture.input.tables);
});

test("独立验证拒绝错配配方、漏能力、住宅阶段改名及推测主题", ({ onTestFinished }) => {
  const fixture = detailsFixture();
  onTestFinished(fixture.cleanup);
  const { database } = extractNeighborBundle(fixture.input);
  for (const mutate of [
    (neighbor: (typeof database.neighbors)[number]) => {
      neighbor.signature.cookingRecipeId = 123;
    },
    (neighbor: (typeof database.neighbors)[number]) => {
      neighbor.abilities = [];
    },
    (neighbor: (typeof database.neighbors)[number]) => {
      neighbor.house!.stages[0].name = "其他住宅";
    },
    (neighbor: (typeof database.neighbors)[number]) => {
      neighbor.design.furnitureSetId = 5;
    },
  ]) {
    const altered = structuredClone(database);
    mutate(altered.neighbors.find((row) => row.id === 1010)!);
    expect(() => verifyNeighborDetails(altered, fixture.input.tables)).toThrow();
  }
});

test("拒绝基线外缺失专属物品并排除测试台词", ({ onTestFinished }) => {
  const rows = fixtureRows();
  rows[500]!.find((row) => row[0] === 1010)![1] = 999;
  const invalid = createFixture(rows);
  onTestFinished(invalid.cleanup);
  expect(() => extractNeighborBundle(invalid.input)).toThrow("Unexpected missing signature outfit");
  rows[500]!.find((row) => row[0] === 1010)![1] = null;
  rows[643]!.push([1010, 99, null, null, null, null, null, null, { text: "(test)测试" }]);
  const valid = createFixture(rows);
  onTestFinished(valid.cleanup);
  const result = extractNeighborBundle(valid.input);
  expect(result.database.travelReactions.some((row) => row.variantId === 99)).toBe(false);
  expect(result.audit.exclusions).toContainEqual(
    expect.objectContaining({ key: "1010:99", reason: "test_reaction" }),
  );
});
