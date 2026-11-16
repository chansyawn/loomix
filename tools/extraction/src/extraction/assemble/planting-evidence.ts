import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../evidence/domain-schema.ts";
import type { CollectionEvidence } from "../source/catalog/collection/evidence.ts";
import { evidenceEntity, evidenceField } from "./validate-evidence.ts";

export function plantingDomainEvidence(
  proofs: CollectionEvidence[],
  dataset: Dataset,
): FieldEvidence[] {
  const fields: FieldEvidence[] = proofs.flatMap((proof): FieldEvidence[] => {
    // 生长配置已内嵌到同 ID 的种子，配置字段映射到 growth 下。
    if (proof.field === "image" || proof.field.endsWith(".image")) return [];
    let fieldPath = proof.owner === "seed" ? proof.field : `growth.${proof.field}`;
    if (proof.owner === "growth" && proof.field.startsWith("stages.")) {
      const [, stageId, field] = proof.field.split(".");
      const item = dataset.catalog.items.find((item) => item.id === proof.id);
      if (!item || item.kind !== "seed") throw new Error(`Missing growth owner ${proof.id}`);
      const index = item.growth.stages.findIndex((stage) => stage.id === Number(stageId));
      if (index < 0) throw new Error(`Missing growth stage ${stageId}`);
      fieldPath = `growth.stages.${index}.${field}`;
    }
    const seed = evidenceEntity(dataset, "catalog.items", proof.id);
    if (!seed || !evidenceField(seed, fieldPath).found) return [];
    return [
      {
        entity: { collection: "catalog.items", id: proof.id },
        fieldPath,
        status: proof.status === "confirmed" ? "confirmed" : "unresolved",
        sources: proof.sources.map(({ file, table, rowOffset, fields }) => ({
          kind: "table",
          file,
          table,
          rowOffset,
          fields,
        })),
        ruleId: "client.planting.explicit_configuration",
        reasonCode: proof.reason ?? null,
      },
    ];
  });
  return fields;
}
