import assert from "node:assert/strict";
import type { CollectionObservations } from "../extraction/schema.ts";
import type { Tables } from "../extraction/decode/tables.ts";
import { creatureSizeRange, plainText, scaledCreatureSize } from "../extraction/content/model.ts";
import { verifyTreeDrops } from "./tree-drops.ts";

export function verifyCollectionFields(catalog: CollectionObservations, tables: Tables) {
  const content = tables.byId(93);
  const recipeByDish = new Map(tables.rows(122).map((row) => [tables.uint(row, 4), row]));
  const difficulties = tables.byId(121);
  const creatureScales = tables.byId(132);
  const requiredFields = new Map<string, unknown>();
  const acquisition = (id: number) => {
    const rows = tables.rows(325).filter((row) => tables.id(row) === id);
    const codes = tables.vector(rows[0], 2);
    for (const row of rows)
      assert.deepEqual(tables.vector(row, 2), codes, "Consistent acquisition source vectors");
    if (!codes?.length) return null;
    const entries = codes.map((sourceId) => {
      const label = plainText(tables.text(tables.byId(618).get(sourceId), 1));
      return sourceId > 0 && label ? { sourceId, label, condition: null } : null;
    });
    return entries.every((entry) => entry !== null) ? entries : null;
  };
  for (const record of catalog.items) {
    const detail = catalog.details.find((entry) => entry.id === record.id);
    assert.ok(detail, `Missing details for ${record.id}`);
    for (const field of [
      "flowerColors",
      "hybridRecipes",
      "treeDrops",
      "creatureSize",
      "creatureGrades",
      "trade",
      "acquisitionConditions",
      "dishEffects",
    ] as const) {
      if (record.kind === "item" && record.category === "creatures" && field === "creatureSize")
        continue;
      requiredFields.set(`item:${record.id}:detail.${field}`, detail[field]);
    }
    if (record.kind !== "item") continue;
    assert.deepEqual(
      detail.acquisitionConditions,
      acquisition(record.id),
      "Independent item acquisition",
    );
    const expect = (field: string, actual: unknown, expected: unknown) => {
      assert.deepEqual(actual, expected, `${record.id}.${field}`);
      requiredFields.set(`item:${record.id}:${field}`, actual);
    };
    if (record.category === "clothing") continue;
    if (record.category === "plants") {
      verifyTreeDrops(tables, record.id, detail.treeDrops);
    }
    if (record.category === "creatures") {
      const row = content.get(record.id);
      const scale = creatureScales.get(record.id);
      const min = tables.uint(scale, 4);
      const max = tables.uint(scale, 5);
      const multiplier = tables.float(scale, 6);
      const expectedSize =
        min !== null && max !== null && min <= max
          ? scaledCreatureSize(min, max, multiplier)
          : null;
      assert.deepEqual(detail.creatureSize, expectedSize, "Creature size follows table endpoints");
      requiredFields.set(`item:${record.id}:detail.creatureSize`, expectedSize);
      expect(
        "attributes.scientificName",
        record.attributes.scientificName,
        plainText(tables.text(row, 16)),
      );
      assert.deepEqual(
        record.attributes.sizeRange,
        creatureSizeRange(min, max, multiplier),
        `${record.id}.attributes.sizeRange`,
      );
    }
    if (record.category === "dishes") {
      const recipe = recipeByDish.get(record.id);
      const tastes = tables.string(recipe, 15);
      expect(
        "attributes.tastes",
        record.attributes.tastes,
        tastes ? [...new Set(tastes.split("|"))] : null,
      );
      const row = difficulties.get(tables.uint(recipe, 2));
      const rawExpression = tables.string(row, 2);
      let requirement: unknown = null;
      if (rawExpression) {
        const input: unknown = JSON.parse(rawExpression);
        assert.ok(typeof input === "object" && input !== null && "childList" in input);
        const list = input.childList;
        assert.ok(
          typeof list === "object" &&
            list !== null &&
            "nodeList" in list &&
            Array.isArray(list.nodeList) &&
            list.nodeList.length === 1,
        );
        const node: unknown = list.nodeList[0];
        assert.ok(typeof node === "object" && node !== null && "leaf" in node);
        const leaf = node.leaf;
        assert.ok(typeof leaf === "object" && leaf !== null);
        const entries = Object.entries(leaf);
        assert.equal(entries.length, 1);
        const [kind, parameters] = entries[0]!;
        assert.ok(kind === "chefLevelGreaterOrEqual" || kind === "learnCookRecipeInCategory");
        assert.ok(typeof parameters === "object" && parameters !== null);
        requirement = { rawExpression, condition: { kind, ...parameters }, unresolvedReason: null };
      }
      expect("difficultyRequirement", record.difficultyRequirement, requirement);
    }
  }
  return { requiredFields };
}
