import assert from "node:assert/strict";
import { isListedItem } from "@loomix/schema/catalog";
import type { Catalog } from "@loomix/schema/catalog";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { TAG_SOURCE_FIELD_NAMES } from "../source/client/catalog-metadata.ts";
import type { readCatalogMetadata } from "../source/client/catalog-metadata.ts";
import { profile } from "../profile.ts";

export function verifyCatalogMetadata(
  catalog: Catalog,
  evidence: FieldEvidence[],
  metadata: ReturnType<typeof readCatalogMetadata>,
): void {
  const typeTags = [...metadata.typeTags.values()];
  const counts = {
    records: 0,
    clientTypes: typeTags.length,
    populatedTypes: typeTags.filter((tagIds) => tagIds.length > 0).length,
    distinctTypeTags: new Set(typeTags.flat()).size,
    foodMaterials: { populated: 0, changed: 0, added: 0 },
    npcFurnitureCategory: { populated: 0, changed: 0, added: 0 },
    typeTags: { populated: 0, changed: 0, added: 0 },
    changedRecords: 0,
    addedTags: 0,
  };
  const proofs = new Set(
    evidence.map((proof) => `${proof.entity.collection}:${proof.entity.id}:${proof.fieldPath}`),
  );
  const items = catalog.items.filter(isListedItem);
  for (const id of [...items, ...catalog.collections].map((entry) => entry.id)) {
    counts.records++;
    const { fields, typeTagIds, tagIds } = metadata.record(id).value;
    // 此处仅针对已冻结版本与原来十列来源比较，不能作为后续版本的通用数量约束。
    const baseline = new Set(TAG_SOURCE_FIELD_NAMES.slice(0, 10).flatMap((field) => fields[field]));
    for (const [key, ids] of [
      ["foodMaterials", fields.foodMaterials],
      ["npcFurnitureCategory", fields.npcFurnitureCategory],
      ["typeTags", typeTagIds],
    ] as const) {
      const added = ids.filter((tagId) => !baseline.has(tagId)).length;
      if (ids.length) counts[key].populated++;
      if (added) counts[key].changed++;
      counts[key].added += added;
    }
    const added = tagIds.filter((tagId) => !baseline.has(tagId)).length;
    if (added) counts.changedRecords++;
    counts.addedTags += added;
    assert.ok(
      [...baseline].every((tagId) => tagIds.includes(tagId)),
      `Original direct tags ${id}`,
    );
  }
  for (const item of items) {
    assert.deepEqual(item.tagIds, metadata.record(item.id).value.tagIds, `Item tags ${item.id}`);
    for (const field of ["kind", "tagIds"])
      assert.ok(
        proofs.has(`catalog.items:${item.id}:${field}`),
        `Catalog metadata provenance ${item.id}.${field}`,
      );
  }
  assert.deepEqual(counts, profile.expectedCatalogMetadata, "Frozen catalog tag coverage");
}
