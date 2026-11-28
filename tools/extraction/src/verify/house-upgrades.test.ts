import { expect, test } from "vite-plus/test";
import { datasetFixture } from "../../../../packages/schema/tests/fixture.ts";
import { buildDomainEvidence } from "../extraction/assemble/evidence.ts";
import { buildNeighbors } from "../extraction/assemble/neighbors.ts";
import { extractNeighborBundle } from "../extraction/source/neighbors/extract.ts";
import { createFixture, fixtureRows } from "../extraction/source/neighbors/fixtures/tables.ts";
import { neighborReferencedItemIds } from "../extraction/source/neighbors/references.ts";
import { verifyHouseUpgrades } from "./house-upgrades.ts";

function houseRows() {
  const rows = fixtureRows();
  rows[310]!.push([1, null, null], [2, null, null], [4, null, 1012]);
  for (const [id, house, materials, blueprint] of [
    [302, 1010, 1018, 10014],
    [502, 1009, 1018, 10004],
    [106, 1, 1006, 10006],
    [204, 2, 1006, 10014],
    [402, 4, 1006, 10006],
  ] as const) {
    const stage = [...rows[315]![0]!];
    stage[0] = id;
    stage[1] = house;
    stage[2] = 2;
    stage[11] = materials;
    stage[26] = blueprint;
    rows[315]!.push(stage);
  }
  rows[377] = [
    [1018, 30031, 10, 10],
    [10014, 29000, 1, 1],
    [1018, 30104, 15, 15],
    [10004, 29002, 1, 1],
    [10006, 29001, 1, 1],
    [1006, 200002, 10, 500],
  ];
  rows[318]!.push([30031], [30104], [29000], [29002], [29001], [200002]);
  return rows;
}

test("房屋阶段保留共用建材和各自的图纸，独立验收核对来源与准入范围", ({ onTestFinished }) => {
  const fixture = createFixture(houseRows());
  onTestFinished(fixture.cleanup);
  const { database, audit } = extractNeighborBundle(fixture.input);
  const dataset = datasetFixture();
  dataset.neighbors = buildNeighbors(database, () => null, []);
  const evidence = buildDomainEvidence(dataset, [], [], audit.records);
  for (const proof of evidence) {
    for (const source of proof.sources) source.file = `source/${source.file}`;
  }
  const verify = () =>
    verifyHouseUpgrades(fixture.input.tables, database, dataset.neighbors, evidence);
  verify();
  const owner = dataset.neighbors.neighbors.find(({ id }) => id === 1010)!;
  const stages = owner.house!.stages;
  const upgrade = stages[1]!.upgrade!;
  expect(stages[0]!.upgrade).toBeNull();
  expect(upgrade).toEqual({
    materials: [
      { itemId: 30031, quantity: 10 },
      { itemId: 30104, quantity: 15 },
    ],
    blueprint: { itemId: 29000, quantity: 1 },
  });
  const ids = neighborReferencedItemIds(database);
  expect(ids).toEqual(expect.arrayContaining([30031, 30104, 29000, 29002]));
  expect(ids).not.toContain(29001);
  expect(ids).not.toContain(200002);

  const materialProof = evidence.find(
    (entry) =>
      String(entry.entity.id) === "1010" &&
      entry.fieldPath === "house.stages.1.upgrade.materials.0",
  )!;
  const removedSource = materialProof.sources.pop()!;
  upgrade.materials[0]!.quantity++;
  expect(verify).toThrow("house.stages.1.upgrade.materials.0");
  materialProof.sources.push(removedSource);
  expect(verify).toThrow("Independent neighbor house upgrades");
  upgrade.materials[0]!.quantity--;
  verify();
  const otherOwner = dataset.neighbors.neighbors.find(({ id }) => id === 1009)!;
  upgrade.blueprint = otherOwner.house!.stages[1]!.upgrade!.blueprint;
  expect(verify).toThrow("Independent neighbor house upgrades");
  upgrade.blueprint = { itemId: 29000, quantity: 1 };
  dataset.neighbors.neighbors = dataset.neighbors.neighbors.filter(({ id }) => id !== owner.id);
  database.neighbors = database.neighbors.filter(({ id }) => id !== owner.id);
  expect(verify).toThrow("Independent neighbor house upgrades");
});

test.each([11, 26])("已配置的升级阶段缺少组字段 %i 时停止采集", (field) => {
  const rows = houseRows();
  rows[315]!.find((row) => row[0] === 302)![field] = null;
  const fixture = createFixture(rows);
  try {
    expect(() => extractNeighborBundle(fixture.input)).toThrow(
      /Incomplete upgrade for house stage 302/,
    );
  } finally {
    fixture.cleanup();
  }
});

test.each([
  ["缺少建材组", 1018, [], /group size/],
  ["缺少图纸组", 10014, [], /group size/],
  [
    "图纸多项",
    10014,
    [
      [29000, 1, 1],
      [29002, 1, 1],
    ],
    /group size/,
  ],
  [
    "材料重复",
    1018,
    [
      [30031, 10, 10],
      [30031, 10, 10],
    ],
    /Duplicate/,
  ],
  ["数量冲突", 1018, [[30104, 10, 15]], /quantity/],
  ["零数量", 1018, [[30104, 0, 0]], /quantity/],
  ["未知物品", 1018, [[999999, 1, 1]], /item/],
] as const)("拒绝%s的房屋升级配置", (_label, group, changed, message) => {
  const rows = houseRows();
  rows[377] = [
    ...rows[377]!.filter((row) => row[0] !== group),
    ...changed.map((row) => [group, ...row]),
  ];
  const fixture = createFixture(rows);
  try {
    expect(() => extractNeighborBundle(fixture.input)).toThrow(message);
  } finally {
    fixture.cleanup();
  }
});
