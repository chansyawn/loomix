import { expect, test } from "vite-plus/test";
import { reference } from "../../../../../../packages/schema/tests/fixture.ts";
import { validateDataset } from "@loomix/schema/dataset";
import { assemble } from "../../assemble/index.ts";
import { clientReadRecordsFixture } from "../../fixtures/client-read-records.ts";
import { emptyFlowerHybridization } from "../../fixtures/flower-hybridization.ts";
import { verifyStarseaSources } from "../../../verify/starsea.ts";
import { imageCollector } from "../images.ts";
import { createFixture } from "../neighbors/fixtures/tables.ts";
import type { FixtureRows } from "../neighbors/fixtures/tables.ts";
import { readStarsea } from "./read.ts";

function fixtureRows(): FixtureRows {
  const islet = (
    id: number,
    style: number,
    display: string | null,
  ): FixtureRows[number][number] => {
    const row: FixtureRows[number][number] = Array(28).fill(null);
    row[0] = id;
    row[1] = { text: `星屿${id}` };
    row[16] = id + 1000;
    row[17] = style;
    row[25] = display;
    return row;
  };
  return {
    318: [[20, { text: "贝壳" }]],
    563: [[81, 2, 20, null, 1, 100]],
    628: [
      [1, { text: "昆虫" }],
      [10, { text: "NPC岛" }],
    ],
    650: [[1, { text: "禾夏" }]],
    651: [[1, 1, 1, { vector: [1] }]],
    652: [
      [1, 1, null, 1, { text: "禾夏H83区" }, 1001, { vector: [1] }],
      [2, 1, null, 2, { text: "沐雪季·禾夏H84区" }, 1002, { vector: [] }],
    ],
    653: [
      [11, 100, null, { vector: [2] }, { vector: [1] }],
      [12, 100, null, { vector: [2] }, { vector: [1] }],
      [13, 100, null, { vector: [3] }, { vector: [1, 2] }],
      [14, 100, null, { vector: [] }, { vector: [2] }],
    ],
    654: [islet(1, 1, "20,20"), islet(2, 10, null), islet(3, 10, null), islet(101, 1, null)],
    655: [[1, 1, null, "特产:81"]],
  };
}

test("区域关系可反查，未知候选与空候选独立，星屿物品引用在组装中保留", () => {
  const fixture = createFixture(fixtureRows());
  try {
    const { tables } = fixture.input;
    const observations = clientReadRecordsFixture();
    const ids = [11, 12, 13, 14];
    const images = imageCollector([], new Map());
    observations.starsea = readStarsea(tables, new Set(ids), images);
    observations.imageNeeds = images.needs;
    observations.neighbors.neighbors = ids.map((id) => ({
      id,
      nameZh: `友邻${id}`,
      bodyType: null,
      profile: { englishName: null, nickname: null, birthday: null },
      abilities: [],
      house: null,
    }));
    observations.catalog.items = [reference(20), reference(21)];
    const { dataset } = assemble(observations, [], emptyFlowerHybridization(observations.source));
    const { starsea } = dataset;
    expect(starsea.regions.map((region) => region.encounters)).toEqual([
      [
        { neighborId: 11, candidateIsletIds: [2] },
        { neighborId: 12, candidateIsletIds: [2] },
        { neighborId: 13, candidateIsletIds: null },
      ],
      [
        { neighborId: 13, candidateIsletIds: null },
        { neighborId: 14, candidateIsletIds: [] },
      ],
    ]);
    expect(starsea.islets.map((entry) => entry.id)).toEqual([1, 2]);
    expect(
      starsea.islets
        .filter((entry) => entry.displayedCreatureIds?.includes(20))
        .map((entry) => entry.id),
    ).toEqual([1]);
    expect(dataset.catalog.items.map((entry) => entry.id)).toEqual([20]);
    expect(validateDataset(dataset)).toEqual([]);
    expect(observations.starsea.diagnostics.islets.map((entry) => entry.disposition)).toEqual([
      "linked",
      "linked",
      "unplaced",
      "test",
    ]);
    verifyStarseaSources(dataset, observations.starsea.diagnostics, tables);
    starsea.regions[0].encounters[0].candidateIsletIds = [1];
    observations.starsea.data.regions[0].encounters[0].candidateIsletIds = [1];
    expect(() => verifyStarseaSources(dataset, observations.starsea.diagnostics, tables)).toThrow(
      "Independent starsea region and encounter configuration",
    );
  } finally {
    fixture.cleanup();
  }
});
