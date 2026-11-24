import { expect, test } from "vite-plus/test";
import { collection, datasetFixture, plant } from "../../../../packages/schema/tests/fixture.ts";
import { parseFlowerHybridization } from "../extraction/external/flower-hybridization.ts";
import { flowerHybridizationFile } from "../extraction/external/flower-hybridization.ts";
import { flowerInputFixture } from "../extraction/fixtures/flower-hybridization.ts";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { verifyFlowerHybridization } from "./flower-hybridization.ts";

test("独立验收直接核对封存关系和字段位置", () => {
  const { source, catalog } = datasetFixture();
  catalog.items = [1, 2, 3, 4].map((id) => ({ ...plant(id), category: "花" }));
  const recipe = { parentItemIds: [1, 2] as [number, number], productItemId: 3 };
  const series = { ...collection(10, "plant", [1, 2, 3, 4]), flowerHybridization: [recipe] };
  catalog.collections = [series];
  const input = parseFlowerHybridization(
    Buffer.from(JSON.stringify(flowerInputFixture(source, [{ ...recipe, seriesId: 10 }]))),
    source,
  );
  const fields: FieldEvidence[] = ["flowerHybridization", "flowerHybridization.0"].map(
    (fieldPath) => ({
      entity: { collection: "catalog.collections", id: 10 },
      fieldPath,
      status: "confirmed",
      sources: [
        {
          kind: "manual",
          file: `source/${flowerHybridizationFile}`,
          sha256: input.sha256,
          pointer: "/recipes/0",
        },
      ],
      ruleId: "external.flower_hybridization",
      reasonCode: null,
    }),
  );
  expect(() => verifyFlowerHybridization(catalog, fields, input)).not.toThrow();
  const incorrectFields = fields.map((proof) => ({
    ...proof,
    sources: proof.sources.map((entry) => ({ ...entry, pointer: "/recipes/1" })),
  }));
  expect(() => verifyFlowerHybridization(catalog, incorrectFields, input)).toThrow(
    "Incorrect evidence",
  );
  series.flowerHybridization = [{ ...recipe, productItemId: 4 }];
  expect(() => verifyFlowerHybridization(catalog, incorrectFields, input)).toThrow(
    "Unexpected published",
  );
});
