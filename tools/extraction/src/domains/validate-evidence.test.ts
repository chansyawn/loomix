import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import { validateDomainEvidence } from "./validate-evidence.ts";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
const dataset = () =>
  emptyDataset(
    { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
    { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
  );
const proof: FieldEvidence = {
  entity: { collection: "catalog.references", id: 1 },
  fieldPath: "name",
  status: "confirmed",
  sources: [{ kind: "table", file: "prepared/ed.obb", table: 318, rowOffset: 100, fields: [1] }],
  ruleId: "test",
  reasonCode: null,
};
test("证据必须指向真实实体及字段，拒绝旧集合和冲突状态", () => {
  const data = dataset();
  data.catalog.references.push({ id: 1, name: "物品" });
  expect(validateDomainEvidence(data, [proof, proof])).toHaveLength(1);
  expect(() => validateDomainEvidence(data, [{ ...proof, fieldPath: "quality" }])).toThrow(
    "Unknown evidence field",
  );
  expect(() =>
    validateDomainEvidence(data, [{ ...proof, entity: { collection: "catalog.items", id: 1 } }]),
  ).toThrow("Unknown evidence entity");
  expect(() =>
    validateDomainEvidence(data, [
      proof,
      { ...proof, status: "unresolved", reasonCode: "missing" },
    ]),
  ).toThrow("Conflicting evidence status");
});

test("统一标签证据指向独立文档，旧局部字典不再接受", () => {
  const data = dataset();
  data.gameplayTags.tags.push({
    id: 1,
    internalName: "食材",
    enumName: null,
    parentId: null,
    displayName: null,
  });
  const tagProof = { ...proof, entity: { collection: "gameplayTags.tags", id: 1 }, fieldPath: "$" };
  expect(validateDomainEvidence(data, [tagProof])).toEqual([tagProof]);
  expect(() =>
    validateDomainEvidence(data, [
      { ...tagProof, entity: { collection: "catalog.gameplayTags", id: 1 } },
    ]),
  ).toThrow("Unknown evidence entity");
});
