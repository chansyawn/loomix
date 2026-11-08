import { expect, test } from "vite-plus/test";
import type { ContentContext } from "../content/context.ts";
import type { TableRow } from "../types.ts";
import { readPlantings } from "./read.ts";
import { plantingImageCandidates } from "./images.ts";

type Value = number | string | number[] | null;
interface FakeRow extends TableRow {
  values: Record<number, Value>;
}
function row(root: number, id: number, values: Record<number, Value> = {}): FakeRow {
  return { root, rowOffset: id * 10, values: { 0: id, ...values } };
}
function context(rows: FakeRow[], formalIds: number[]) {
  const tables = {
    rows: (root: number) => rows.filter((r) => r.root === root),
    byId: (root: number) =>
      new Map(rows.filter((r) => r.root === root).map((r) => [r.values[0], r])),
    id: (r: FakeRow) => r.values[0],
    uint: (r: FakeRow | undefined, f: number, fallback: number | null = null) =>
      typeof r?.values[f] === "number" ? r.values[f] : fallback,
    string: (r: FakeRow | undefined, f: number) =>
      typeof r?.values[f] === "string" ? r.values[f] : null,
    vector: (r: FakeRow | undefined, f: number) =>
      Array.isArray(r?.values[f]) ? r.values[f] : null,
    text: (r: FakeRow | undefined, f: number) =>
      f === 1 && r?.root === 318 ? `物品${String(r.values[0])}` : null,
    textmap: {},
  };
  return {
    tables,
    main: tables.byId(318),
    scope: { groups: new Map(formalIds.map((id) => [id, "plants.item"])) },
    vocabulary: { sources: new Map() },
    resolveIcon: () => null,
  } as unknown as ContentContext;
}
const tree = () => [
  row(318, 30225, { 2: 77 }),
  row(318, 50260),
  row(318, 50261),
  row(318, 50193),
  row(334, 30225, { 1: "ITEM_USE_EFFECT_PLANT_TREE_SEEDLING", 2: "50260" }),
  row(709, 50260, { 2: 50261 }),
  row(709, 50261, { 2: 50193, 3: 2, 4: 4 }),
];

test("apple and ginkgo seeds retain explicit chains and unknown elapsed days", () => {
  for (const id of [30225, 30226]) {
    const rows = tree();
    rows[0] = row(318, id, { 2: 77 });
    rows[4] = row(334, id, { 1: "ITEM_USE_EFFECT_PLANT_TREE_SEEDLING", 2: "50260" });
    const result = readPlantings(context(rows, [50193]));
    expect(result.seeds.map((s) => s.id)).toEqual([id]);
    expect(result.growths[0]).toMatchObject({
      kind: "staged",
      maturityDays: null,
      stages: [
        { id: 50260, plantId: null },
        { id: 50261, plantId: null },
        { id: 50193, plantId: 50193 },
      ],
    });
    expect(result.investigation).toContainEqual(expect.objectContaining({ id: 50261 }));
  }
});

test("flowers connect to material IDs and shrubs retain stages after their formal plant", () => {
  const rows = tree();
  rows[4] = row(334, 30225, { 1: "ITEM_USE_EFFECT_PLANT_FIXED_SEEDLING", 2: "50260" });
  rows.push(row(318, 50199), row(241, 50193, { 1: 50199, 2: 50199 }));
  expect(readPlantings(context(rows, [50199])).growths[0].stages.at(-1)?.plantId).toBe(50199);
  rows.push(row(318, 50236), row(709, 50193, { 2: 50236 }));
  const result = readPlantings(context(rows, [50193]));
  expect(result.growths[0].stages.map((s) => s.id)).toEqual([50260, 50261, 50193, 50236]);
  expect(result.growths[0].stages.at(-1)?.plantId).toBeNull();
});

test("seed exclusions distinguish missing, random and unrelated configurations", () => {
  const rows = [
    row(318, 1, { 2: 77 }),
    row(318, 2, { 2: 77 }),
    row(318, 3, { 2: 77 }),
    row(318, 100),
    row(334, 2, { 1: "ITEM_USE_EFFECT_PLANT_RANDOM_SEEDLING", 2: "100,101" }),
    row(334, 3, { 1: "ITEM_USE_EFFECT_PLANT_FIXED_SEEDLING", 2: "100" }),
  ];
  expect(readPlantings(context(rows, [])).exclusions.map((r) => r.reason)).toEqual([
    "missing_use_configuration",
    "random_planting_outside_scope",
    "no_formal_plant",
  ]);
});

test("plant chains reject cycles, missing targets, malformed effects and conflicting associations", () => {
  const cases = [
    [...tree(), row(709, 50193, { 2: 50260 })],
    tree().filter((r) => r.root !== 318 || r.values[0] !== 50261),
    tree().map((r) =>
      r.root === 334
        ? row(334, 30225, { 1: "ITEM_USE_EFFECT_PLANT_TREE_SEEDLING", 2: "50260,50261" })
        : r,
    ),
    tree().map((r) => (r.root === 334 ? row(334, 30225, { 1: "UNKNOWN", 2: "50260" }) : r)),
    [...tree(), row(318, 50199), row(241, 50193, { 1: 50199 })],
  ];
  for (const rows of cases) expect(() => readPlantings(context(rows, [50193, 50199]))).toThrow();
});

test("crop variants, regrowth and withered stages preserve their configured roles", () => {
  const rows = [
    row(318, 30213, { 2: 72 }),
    ...[1, 2, 3, 4].map((id) => row(318, id)),
    row(144, 30213, { 3: "DAILY", 4: [1], 5: 3, 6: [1], 8: [2, 3], 9: 4, 10: [11, 12] }),
    row(137, 2, { 1: 11, 2: "NORMAL", 3: "NORMAL" }),
    row(137, 3, { 1: 12, 2: "GIANT", 3: "GIANT" }),
  ];
  const result = readPlantings(context(rows, [11, 12]));
  expect(result.growths[0]).toMatchObject({
    kind: "crop",
    initialStageIds: [1],
    regrowthStageIds: [1],
    matureStages: [{ stageId: 2 }, { stageId: 3 }],
    witheredStageId: 4,
    harvestCount: 3,
  });
  expect(result.growths[0].stages.map((s) => s.plantId)).toEqual([null, 11, 12, null]);
  rows[6] = row(137, 2, { 1: 99 });
  expect(() => readPlantings(context(rows, [11, 12]))).toThrow();
});

test("unconfigured images produce no candidates without inventing replacements", () => {
  const ctx = context(tree(), [50193]);
  const images = plantingImageCandidates(ctx, readPlantings(ctx));
  expect(images.seeds).toEqual([]);
  expect(images.stages).toEqual([]);
  expect(images.audit.every((entry) => entry.reason === "missing_display_row")).toBe(true);
});

test("image audits distinguish missing rows, empty configuration and unmatched resource references", () => {
  const ctx = context(
    [...tree(), row(325, 30225, { 4: "UISprite/missing" }), row(325, 50260)],
    [50193],
  );
  const audit = plantingImageCandidates(ctx, readPlantings(ctx)).audit;
  expect(audit.find((entry) => entry.id === 30225)).toMatchObject({
    reason: "no_exact_indexed_image_match",
    references: [{ reference: null }, { reference: "UISprite/missing", match: null }],
  });
  expect(audit.find((entry) => entry.id === 50260)?.reason).toBe("image_not_configured");
  expect(audit.find((entry) => entry.id === 50261)?.reason).toBe("missing_display_row");
});
