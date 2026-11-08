import assert from "node:assert/strict";
import path from "node:path";
import type { CollectionObservations } from "../extraction/schema.ts";
import { Tables } from "../extraction/decode/tables.ts";
import { createContentContext } from "../extraction/content/context.ts";
import { readPlantings } from "../extraction/plants/read.ts";
import { readJson } from "../workflow/json.ts";
import { plainText } from "../extraction/content/model.ts";
import type { ObservedGrowth } from "../extraction/plants/schema.ts";

export function verifyPlantings(catalog: CollectionObservations, bundle: string) {
  const tables = new Tables(path.join(bundle, "prepared"));
  const main = tables.byId(318),
    next = tables.byId(709),
    flowers = tables.byId(241);
  const plants = new Set(
    catalog.items
      .filter((record) => record.kind === "item" && record.category === "plants")
      .map((record) => record.id),
  );
  const expected: ObservedGrowth[] = [];
  const seedIds = new Set<number>();
  for (const row of tables.rows(144)) {
    const id = tables.id(row);
    const products = tables.vector(row, 10) ?? [];
    if (!products.some((id) => plants.has(id))) continue;
    const initialStageIds = tables.vector(row, 4) ?? [];
    const regrowthStageIds = tables.vector(row, 6);
    const matureIds = tables.vector(row, 8) ?? [];
    const witheredStageId = tables.uint(row, 9);
    const links = new Map(matureIds.map((id) => [id, tables.byId(137).get(id)]));
    const stageIds = [
      ...new Set([
        ...initialStageIds,
        ...(regrowthStageIds ?? []),
        ...matureIds,
        ...(witheredStageId === null ? [] : [witheredStageId]),
      ]),
    ].sort((a, b) => a - b);
    expected.push({
      id,
      kind: "crop",
      maturityDays: null,
      cycleMode: tables.string(row, 3),
      initialStageIds,
      regrowthStageIds,
      witheredStageId,
      harvestCount: tables.uint(row, 5),
      matureStages: matureIds.map((stageId) => ({
        stageId,
        tag: tables.string(links.get(stageId), 2),
        rank: tables.string(links.get(stageId), 3),
      })),
      stages: stageIds.map((stageId) => ({
        id: stageId,
        name: plainText(tables.text(main.get(stageId), 1))!,
        image: null,
        plantId: tables.uint(links.get(stageId), 1),
      })),
    });
    seedIds.add(id);
  }
  const uses = tables.byId(334);
  for (const [id, item] of main) {
    if (id === null || tables.uint(item, 2) !== 77) continue;
    const use = uses.get(id),
      effect = tables.string(use, 1);
    if (!use || effect === "ITEM_USE_EFFECT_PLANT_RANDOM_SEEDLING") continue;
    assert.ok(
      effect === "ITEM_USE_EFFECT_PLANT_TREE_SEEDLING" ||
        effect === "ITEM_USE_EFFECT_PLANT_FIXED_SEEDLING",
    );
    const parameter = tables.string(use, 2);
    assert.ok(parameter && /^[1-9]\d*$/.test(parameter));
    let stageId: number | null = Number(parameter);
    const stages: ObservedGrowth["stages"] = [],
      seen = new Set<number>();
    while (stageId !== null) {
      assert.ok(!seen.has(stageId) && main.has(stageId), "Independent complete plant chain");
      seen.add(stageId);
      const targets: Set<number> = new Set<number>(plants.has(stageId) ? [stageId] : []);
      const flower = flowers.get(stageId);
      for (const field of [1, 2]) {
        const target = tables.uint(flower, field);
        if (target !== null && plants.has(target)) targets.add(target);
      }
      assert.ok(targets.size <= 1, "Independent unique stage association");
      stages.push({
        id: stageId,
        name: plainText(tables.text(main.get(stageId), 1))!,
        image: null,
        plantId: [...targets][0] ?? null,
      });
      const row = next.get(stageId);
      if (!row) break;
      stageId = tables.uint(row, 2);
      assert.ok(stageId !== null);
    }
    if (!stages.some((stage) => stage.plantId !== null)) continue;
    seedIds.add(id);
    expected.push({ id, kind: "staged", maturityDays: null, stages });
  }
  expected.sort((a, b) => a.id - b.id);
  assert.deepEqual(
    catalog.growths.map((growth) => ({
      ...growth,
      stages: growth.stages.map((stage) => ({ ...stage, image: null })),
    })),
    expected,
    "Independent planting relationships and full stage order",
  );
  assert.deepEqual(
    catalog.seeds.map((seed) => seed.id),
    [...seedIds].sort((a, b) => a - b),
    "Exact seed admission set",
  );
  for (const seed of catalog.seeds) {
    assert.equal(seed.growthId, seed.id);
    assert.equal(seed.name, plainText(tables.text(main.get(seed.id), 1)));
  }
  assert.equal(catalog.seeds.length, 79);
  assert.equal(catalog.growths.filter((growth) => growth.kind === "crop").length, 17);
  assert.equal(catalog.growths.filter((growth) => growth.kind === "staged").length, 62);
  assert.equal(
    new Set(catalog.growths.flatMap((growth) => growth.stages.map((stage) => stage.id))).size,
    317,
  );
  const rebuilt = readPlantings(createContentContext(bundle));
  assert.deepEqual(
    catalog.seeds.map(({ image: _image, ...seed }) => seed),
    rebuilt.seeds.map(({ image: _image, ...seed }) => seed),
    "Complete seed metadata",
  );
  for (const [name, value] of [
    ["plant-evidence", rebuilt.evidence],
    ["plant-exclusions", rebuilt.exclusions],
    ["plant-investigation", rebuilt.investigation],
  ] as const) {
    assert.deepEqual(readJson(path.join(bundle, `${name}.json`)), value, `Rebuilt ${name}`);
    assert.deepEqual(
      readJson(path.join(bundle, `evidence/${name}.json`)),
      value,
      `Preserved ${name}`,
    );
  }
  assert.deepEqual(
    rebuilt.exclusions.map((entry) => entry.id).sort((a, b) => a - b),
    [30224, 30228, 30238, 56999],
  );
}
