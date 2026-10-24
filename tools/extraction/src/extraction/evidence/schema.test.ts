import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { fieldEvidenceSchema } from "./schema.ts";

test("field evidence requires concrete provenance or an explicit unknown reason", () => {
  const proof = {
    id: 1,
    group: "miscellaneous.item",
    field: "name",
    value: "name",
    evidence: { table: 318, field: 1 },
    sources: [{ file: "prepared/ed.obb", table: 318, row: 1, rowOffset: 256, fields: [1] }],
    association: "item ID",
    transformation: "TextMap localization",
    status: "confirmed",
  };
  assert.ok(fieldEvidenceSchema.safeParse(proof).success);
  assert.equal(fieldEvidenceSchema.safeParse({ ...proof, sources: [] }).success, false);
  assert.equal(fieldEvidenceSchema.safeParse({ ...proof, value: null }).success, false);
  assert.ok(
    fieldEvidenceSchema.safeParse({
      ...proof,
      value: null,
      sources: [],
      status: "unconfirmed",
      reason: "name_textmap_missing",
    }).success,
  );
});

test("manual provenance is limited to classification fields", () => {
  const source = {
    file: "supplemental-admissions.json",
    pointer: "/entries/0",
    sha256: "a".repeat(64),
  };
  const proof = {
    id: 30161,
    group: "plants.item",
    field: "subcategory",
    value: "采摘材料",
    evidence: { kind: "manual", ...source },
    sources: [source],
    association: "version-bound manual confirmation",
    transformation: "confirmed classification",
    status: "confirmed",
  };
  for (const field of ["category", "kind", "subcategory"])
    assert.ok(fieldEvidenceSchema.safeParse({ ...proof, field }).success);
  for (const field of ["name", "description", "id", "attributes.harvestCount", "image"])
    assert.equal(fieldEvidenceSchema.safeParse({ ...proof, field }).success, false);
});
