import { test, expect } from "vite-plus/test";
import { datasetFixture, material } from "../../../../packages/schema/tests/fixture.ts";
import { hairDyeingFixture } from "../extraction/fixtures/hair-dyeing.ts";
import { observeHairDyeing } from "../extraction/source/hair-dyeing/read.ts";
import { imageCollector } from "../extraction/source/images.ts";
import { verifyHairDyeing } from "./hair-dyeing.ts";

test("同步改写区域数据、读取记录和依据仍无法通过冻结输入验收", ({ onTestFinished }) => {
  const { inputs, tables, hairstyleIds, cleanup } = hairDyeingFixture();
  onTestFinished(cleanup);
  const observation = observeHairDyeing(
    inputs,
    tables,
    [],
    imageCollector([], new Map()),
    hairstyleIds,
    new Set(),
  );
  const dataset = datasetFixture();
  dataset.catalog.items = [{ ...material(601), kind: "appearance", category: "发型" }];
  dataset.hairDyeing = {
    ...observation.data,
    colorGroups: observation.data.colorGroups.map((group) => ({ ...group, icon: null })),
    colorBlocks: observation.data.colorBlocks.map((block) => ({ ...block, icon: null })),
  };
  expect(() =>
    verifyHairDyeing(
      dataset,
      tables,
      inputs,
      hairstyleIds,
      observation.diagnostics,
      observation.proofs,
    ),
  ).not.toThrow();

  const changed = structuredClone(observation);
  const changedDataset = structuredClone(dataset);
  changed.data.hairstyleConfigs[0]!.regions[0]!.name = "挑染发色";
  changedDataset.hairDyeing.hairstyleConfigs[0]!.regions[0]!.name = "挑染发色";
  changed.diagnostics.hairstyles[0]!.regions[0]!.textHash = 2263953777;
  const nameProof = changed.proofs.find((proof) => proof.fieldPath === "regions.0.name")!;
  const unrelated = changed.proofs.find((proof) => proof.fieldPath === "regions.1.name")!;
  nameProof.sources = unrelated.sources;

  expect(() =>
    verifyHairDyeing(
      changedDataset,
      tables,
      inputs,
      hairstyleIds,
      changed.diagnostics,
      changed.proofs,
    ),
  ).toThrow(
    /Independent field evidence sources hairDyeing\.hairstyleConfigs:601\.regions\.0\.name/,
  );
  expect(() =>
    verifyHairDyeing(
      changedDataset,
      tables,
      inputs,
      hairstyleIds,
      observation.diagnostics,
      observation.proofs,
    ),
  ).toThrow(/Independent dyeable hairstyle scope and regions/);
});
