import type { PlantImageAudit } from "./images.ts";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../evidence/domain-schema.ts";
import type { CollectionEvidence } from "../collection/evidence.ts";
import type { ImageManifest } from "../types.ts";
import { readJson } from "../../workflow/json.ts";

export function plantingDomainEvidence(work: string, dataset: Dataset): FieldEvidence[] {
  const fields: FieldEvidence[] = readJson<CollectionEvidence[]>(
    path.join(work, "plant-evidence.json"),
  ).map((proof) => ({
    entity: {
      collection: proof.owner === "seed" ? "catalog.records" : "catalog.growths",
      id: proof.id,
    },
    fieldPath: proof.field,
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
  }));
  const seeds = new Map(
    readJson<ImageManifest[]>(path.join(work, "seed-image-manifest.json")).map((image) => [
      image.id,
      image,
    ]),
  );
  const stages = new Map(
    readJson<ImageManifest[]>(path.join(work, "stage-image-manifest.json")).map((image) => [
      image.id,
      image,
    ]),
  );
  const audits = new Map(
    readJson<PlantImageAudit[]>(path.join(work, "plant-image-audit.json")).map((entry) => [
      `${entry.kind}:${entry.id}`,
      entry,
    ]),
  );
  const add = (
    collection: string,
    id: number,
    fieldPath: string,
    original: ImageManifest | undefined,
    audit: PlantImageAudit,
  ) =>
    fields.push({
      entity: { collection, id },
      fieldPath,
      status: original ? "confirmed" : "unresolved",
      sources: [
        ...(audit.rowOffset === null
          ? [{ kind: "tableScan" as const, file: "prepared/ed.obb", table: 325 }]
          : [
              {
                kind: "table" as const,
                file: "prepared/ed.obb",
                table: 325,
                rowOffset: audit.rowOffset,
                fields: [0, 4, 5],
              },
            ]),
        ...(original
          ? [{ kind: "asset" as const, file: original.source, pathId: original.pathId }]
          : []),
      ],
      ruleId: "client.planting.exact_image_reference",
      reasonCode: original ? null : audit.reason,
    });
  for (const seed of dataset.catalog.records.filter((record) => record.type === "seed"))
    add("catalog.records", seed.id, "image", seeds.get(seed.id), audits.get(`seed:${seed.id}`)!);
  for (const growth of dataset.catalog.growths)
    growth.stages.forEach((stage, index) =>
      add(
        "catalog.growths",
        growth.id,
        `stages.${index}.image`,
        stages.get(stage.id),
        audits.get(`stage:${stage.id}`)!,
      ),
    );
  return fields;
}
