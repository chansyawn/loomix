import assert from "node:assert/strict";
import path from "node:path";
import { recordType } from "@loomix/schema/extraction";
import type { Catalog } from "@loomix/schema/extraction";
import { createContentContext } from "../extraction/content/context.ts";
import { buildRecord } from "../extraction/content/records/index.ts";
import { catalogSource, profile } from "../profile.ts";
import { readJson } from "../workflow/json.ts";
export function verifyAdmissions(catalog: Catalog, bundle: string): Set<number> {
  const context = createContentContext(bundle);
  const { scope, tables } = context;
  assert.deepEqual(catalog.source, catalogSource, "Catalog source version");
  const originalCounts = Object.fromEntries(
    Object.keys(profile.expectedEncyclopedia).map((type) => [type, 0]),
  );
  for (const row of scope.rows) {
    const type = scope.groups.get(tables.id(row))!;
    originalCounts[type]++;
  }
  assert.deepEqual(originalCounts, profile.expectedEncyclopedia, "Original encyclopedia counts");
  assert.deepEqual(
    readJson(path.join(bundle, "record-evidence.json")),
    scope.admissionEvidence,
    "Fresh admission and encyclopedia evidence",
  );
  assert.deepEqual(
    readJson(path.join(bundle, "evidence/record-evidence.json")),
    scope.admissionEvidence,
    "Sealed admission evidence",
  );
  assert.deepEqual(
    readJson(path.join(bundle, "scope.json")),
    [...scope.ids].sort((a, b) => a - b),
    "Fresh admitted ID union",
  );
  for (const record of catalog.items) {
    assert.equal(
      recordType(record),
      scope.groups.get(record.id),
      `Verified classification ${record.id}`,
    );
    const row = scope.encyclopedia.get(record.id);
    assert.deepEqual(
      record.encyclopediaEntry,
      row ? { listed: tables.byte(row, 1, 0) === 0 } : null,
      `Verified encyclopedia state ${record.id}`,
    );
    if (record.kind === "item" || record.kind === "appearance") {
      const subcategory =
        record.category === "dishes" || record.category === "miscellaneous"
          ? null
          : scope.categories.get(record.id);
      assert.equal(record.subcategory, subcategory, `Verified subcategory ${record.id}`);
    } else
      assert.deepEqual(
        record.memberIds,
        scope.membersOf(record.id),
        `Verified members ${record.id}`,
      );
    const main = context.main.get(record.id);
    assert.ok(main, `Main item ${record.id}`);
    const rebuilt = buildRecord(context, {
      id: record.id,
      group: recordType(record),
      row,
      main,
      ui: context.ui.get(record.id),
      creature: context.creatures.get(record.id),
      crop: context.vocabulary.cropsByProduct.get(record.id),
      recipe: context.recipesByProduct.get(record.id),
    }).record;
    const { image: _image, ...fields } = record;
    const { image: _rebuiltImage, ...expected } = rebuilt;
    assert.deepEqual(fields, expected, `Reconstructed fields ${record.id}`);
  }
  return scope.ids;
}
