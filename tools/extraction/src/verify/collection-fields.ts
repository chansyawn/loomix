import assert from "node:assert/strict";
import type { CollectionObservations } from "../extraction/schema.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import {
  creatureSizeRange,
  plainText,
  scaledCreatureSize,
} from "../extraction/source/catalog/model.ts";
import { verifyTreeDrops } from "./tree-drops.ts";

export function verifyCollectionFields(catalog: CollectionObservations, tables: Tables) {
  const content = tables.byId(93);
  const creatureScales = tables.byId(132);
  const requiredFields = new Map<string, unknown>();
  for (const record of catalog.items) {
    const detail = catalog.details.find((entry) => entry.id === record.id);
    assert.ok(detail, `Missing details for ${record.id}`);
    for (const field of [
      "flowerColors",
      "hybridRecipes",
      "treeDrops",
      "creatureSize",
      "creatureGrades",
      "dishEffects",
    ] as const) {
      if (record.kind === "item" && record.category === "creatures" && field === "creatureSize")
        continue;
      requiredFields.set(`item:${record.id}:detail.${field}`, detail[field]);
    }
    if (record.kind !== "item") continue;
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
  }
  return { requiredFields };
}
