import assert from "node:assert/strict";
import { RECORD_TAG_FIELD_NAMES } from "@loomix/schema/catalog";
import type { Catalog } from "@loomix/schema/catalog";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { profile } from "../profile.ts";

export function verifyCatalogMetadata(catalog: Catalog, evidence: FieldEvidence[]): void {
  const types = new Map(catalog.clientTypes.map((type) => [type.id, type]));
  const counts = {
    records: catalog.records.length,
    clientTypes: catalog.clientTypes.length,
    namedTypes: catalog.clientTypes.filter((type) => type.name !== null).length,
    populatedTypes: catalog.clientTypes.filter((type) => type.tagIds.length > 0).length,
    distinctTypeTags: new Set(catalog.clientTypes.flatMap((type) => type.tagIds)).size,
    foodMaterials: { populated: 0, changed: 0, added: 0 },
    npcFurnitureCategory: { populated: 0, changed: 0, added: 0 },
    typeTags: { populated: 0, changed: 0, added: 0 },
    changedRecords: 0,
    addedTags: 0,
  };
  const proofs = new Set(
    evidence.map((proof) => `${proof.entity.collection}:${proof.entity.id}:${proof.fieldPath}`),
  );
  for (const record of catalog.records) {
    // 此处仅针对已冻结版本与原来十列来源比较，不能作为后续版本的通用数量约束。
    const baseline = new Set(
      RECORD_TAG_FIELD_NAMES.slice(0, 10).flatMap((field) => record.tagFields[field]),
    );
    for (const [key, tagIds] of [
      ["foodMaterials", record.tagFields.foodMaterials],
      ["npcFurnitureCategory", record.tagFields.npcFurnitureCategory],
      ["typeTags", types.get(record.client.type)!.tagIds],
    ] as const) {
      const added = tagIds.filter((id) => !baseline.has(id)).length;
      if (tagIds.length) counts[key].populated++;
      if (added) counts[key].changed++;
      counts[key].added += added;
    }
    const added = record.tagIds.filter((id) => !baseline.has(id)).length;
    if (added) counts.changedRecords++;
    counts.addedTags += added;
    assert.ok(
      [...baseline].every((id) => record.tagIds.includes(id)),
      `Original direct tags ${record.id}`,
    );
    for (const field of [
      "kind",
      "admissionReasons",
      "client.type",
      "client.idType",
      "client.subtype",
      "client.subtypeName",
      "tagIds",
      ...RECORD_TAG_FIELD_NAMES.map((field) => `tagFields.${field}`),
    ])
      assert.ok(
        proofs.has(`catalog.records:${record.id}:${field}`),
        `Catalog metadata provenance ${record.id}.${field}`,
      );
  }
  for (const type of catalog.clientTypes)
    for (const field of ["id", "name", "tagIds"])
      assert.ok(
        proofs.has(`catalog.clientTypes:${type.id}:${field}`),
        `Client type provenance ${type.id}.${field}`,
      );
  assert.deepEqual(counts, profile.expectedCatalogMetadata, "Frozen catalog tag coverage");
}
