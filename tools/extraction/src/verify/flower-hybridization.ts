import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { flowerHybridizationFile } from "../extraction/external/flower-hybridization.ts";
import type { FrozenFlowerHybridization } from "../extraction/external/flower-hybridization.ts";

export function verifyFlowerHybridization(
  catalog: Catalog,
  fields: readonly FieldEvidence[],
  input: FrozenFlowerHybridization,
): void {
  const recipeKey = (seriesId: number, parentItemIds: [number, number], productItemId: number) =>
    [seriesId, ...parentItemIds, productItemId].join(":");
  const expected = new Map(
    input.recipes.map(({ seriesId, parentItemIds, productItemId }, index) => [
      recipeKey(seriesId, parentItemIds, productItemId),
      `/recipes/${index}`,
    ]),
  );
  const flowerIds = new Set(
    catalog.items.flatMap((item) =>
      item.kind === "plant" && item.category === "花" ? [item.id] : [],
    ),
  );
  const evidence = new Map(
    fields
      .filter(
        ({ entity, fieldPath }) =>
          entity.collection === "catalog.collections" &&
          (fieldPath === "flowerHybridization" || fieldPath.startsWith("flowerHybridization.")),
      )
      .map((proof) => [`${proof.entity.id}:${proof.fieldPath}`, proof]),
  );
  for (const collection of catalog.collections) {
    const fieldKey = `${collection.id}:flowerHybridization`;
    const parent = evidence.get(fieldKey);
    assert.ok(parent, `Missing flower hybridization evidence for ${collection.id}`);
    evidence.delete(fieldKey);
    const recipes = collection.flowerHybridization;
    if (recipes === null) {
      assert.equal(parent.status, collection.memberKind === "plant" ? "unresolved" : "absent");
      assert.deepEqual(parent.sources, []);
      continue;
    }
    const members = new Set(collection.memberIds);
    const sources = recipes.map(({ parentItemIds, productItemId }, index) => {
      const key = recipeKey(collection.id, parentItemIds, productItemId);
      const pointer = expected.get(key);
      assert.ok(pointer, `Unexpected published flower hybridization recipe ${key}`);
      expected.delete(key);
      for (const id of [...parentItemIds, productItemId])
        assert.ok(flowerIds.has(id) && members.has(id), `Invalid flower member ${id} in ${key}`);
      const source = {
        kind: "manual",
        file: `source/${flowerHybridizationFile}`,
        pointer,
        sha256: input.sha256,
      };
      const keyForRow = `${fieldKey}.${index}`;
      const proof = evidence.get(keyForRow);
      assert.equal(proof?.status, "confirmed", `Missing verified evidence for ${key}`);
      assert.deepEqual(proof?.sources, [source], `Incorrect evidence for ${key}`);
      evidence.delete(keyForRow);
      return source;
    });
    assert.equal(parent.status, "confirmed");
    assert.deepEqual(parent.sources, sources);
  }
  assert.deepEqual([...expected.keys()], [], "Missing published flower hybridization recipes");
  assert.deepEqual([...evidence.keys()], [], "Unexpected flower hybridization evidence");
}
