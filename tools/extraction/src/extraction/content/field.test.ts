import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { RecordBuilder, known, unknown } from "./field.ts";

test("record builder separates confirmed values from reasoned unknowns", () => {
  const builder = new RecordBuilder("miscellaneous.item", 1, null);
  builder.set("name", known("name", { table: 318, field: 1 }));
  builder.set("description", unknown({ table: 93, field: 4 }, "description_missing"));
  builder.put("quality", 0, { table: 325, field: 15 });

  assert.equal(builder.record.name, "name");
  assert.equal(builder.record.description, null);
  assert.equal(builder.record.quality, 0);
  assert.deepEqual(
    builder.proofs.map((proof) => proof.field),
    ["name", "quality"],
  );
  assert.equal(builder.diagnostics[0].reason, "description_missing");
});
