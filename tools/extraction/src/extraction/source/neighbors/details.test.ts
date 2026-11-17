import { expect, test } from "vite-plus/test";
import { createFixture, fixtureRows } from "./fixtures/tables.ts";
import { extractNeighborBundle } from "./extract.ts";
import { verifyNeighborDetails } from "./verify-details.ts";

function detailsFixture() {
  const rows = fixtureRows();
  rows[222] = [[5, 1010, "UISprite/Watering", { text: "作物浇水" }, { text: "帮忙浇水" }]];
  return createFixture(rows);
}

test("读取资料、能力与住宅，并记录字段来源", ({ onTestFinished }) => {
  const fixture = detailsFixture();
  onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  const neighbor = database.neighbors.find((row) => row.id === 1010)!;
  expect(neighbor.profile).toMatchObject({ nickname: "闷果儿", birthday: { month: 9, day: 19 } });
  expect(neighbor.abilities).toEqual([
    { unlockLevel: 5, name: "作物浇水", description: "帮忙浇水" },
  ]);
  expect(neighbor.house?.stages.length).toBeGreaterThan(0);
  expect(audit.records).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fieldPath: "abilities.0.name", status: "confirmed" }),
    ]),
  );
  verifyNeighborDetails(database, fixture.input.tables);
});

test("独立验证拒绝漏能力与住宅阶段改名", ({ onTestFinished }) => {
  const fixture = detailsFixture();
  onTestFinished(fixture.cleanup);
  const { database } = extractNeighborBundle(fixture.input);
  for (const mutate of [
    (neighbor: (typeof database.neighbors)[number]) => {
      neighbor.abilities = [];
    },
    (neighbor: (typeof database.neighbors)[number]) => {
      neighbor.house!.stages[0]!.name = "其他住宅";
    },
  ]) {
    const altered = structuredClone(database);
    mutate(altered.neighbors.find((row) => row.id === 1010)!);
    expect(() => verifyNeighborDetails(altered, fixture.input.tables)).toThrow();
  }
});
