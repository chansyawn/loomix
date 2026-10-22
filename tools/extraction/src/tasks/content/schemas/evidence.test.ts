import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { fieldEvidenceSchema } from "./evidence.ts";

test("field evidence requires concrete provenance or an explicit unknown reason", () => {
  const proof = {
    id: 1,
    group: "miscellaneous",
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
