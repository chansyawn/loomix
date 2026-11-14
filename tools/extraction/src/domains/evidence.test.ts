import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import { buildDomainEvidence } from "./evidence.ts";

test("story paragraphs merge their provenance on the actual chapter entity", () => {
  const dataset = emptyDataset(
    { formatVersion: 7, snapshotId: "a".repeat(64), locale: "zh-CN" },
    {
      gameVersion: "test",
      dataRevision: 1,
      resourceRevision: 1,
      manifestId: "1",
    },
  );
  dataset.neighbors.stories.push({
    key: "1:2",
    neighborId: 1,
    chapter: 2,
    title: "Chapter",
    paragraphs: [],
  });
  const source = { file: "prepared/ed.obb", table: 10, rowOffset: 100, fields: [0, 1] };
  const result = buildDomainEvidence(
    dataset,
    [],
    [],
    [],
    [
      {
        domain: "neighbors",
        records: [
          { collection: "stories", key: "1:2:1", source },
          { collection: "stories", key: "1:2:2", source: { ...source, rowOffset: 200 } },
          { collection: "encounterIslands", key: "missing", source },
        ],
      },
    ],
  );
  expect(result.fields).toHaveLength(1);
  expect(result.fields[0]).toMatchObject({
    entity: { collection: "neighbors.stories", id: "1:2" },
    sources: [
      { kind: "table", ...source },
      { kind: "table", ...source, rowOffset: 200 },
    ],
  });
});
