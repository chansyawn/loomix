import { readCatalogMetadata } from "../source/client/catalog-metadata.ts";
import { localizedSources } from "../extraction/collection/evidence.ts";
import { acquisition } from "../extraction/collection/details/client.ts";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { createContentContext } from "../extraction/content/context.ts";
import { readJson } from "../workflow/json.ts";
import type { RecordEvidence } from "../extraction/content/admissions.ts";
import type { CollectionEvidence } from "../extraction/collection/evidence.ts";

function tableProof({
  file,
  table,
  rowOffset,
  fields,
}: {
  file: string;
  table: number;
  rowOffset: number;
  fields: number[];
}): FieldEvidence["sources"][number] {
  return { kind: "table", file, table, rowOffset, fields };
}

export function metadataEvidence(work: string, dataset: Dataset): FieldEvidence[] {
  const context = createContentContext(work);
  const metadata = readCatalogMetadata(context.tables, context.gameplayTags.index);
  const admissions = new Map(
    readJson<RecordEvidence[]>(path.join(work, "record-evidence.json")).map((proof) => [
      proof.id,
      proof,
    ]),
  );
  const seedProofs = readJson<CollectionEvidence[]>(path.join(work, "plant-evidence.json"));
  const neighborAudit = readJson<{
    records: {
      collection: string;
      key: string;
      source: { kind: "table"; file: string; table: number; rowOffset: number; fields: number[] };
    }[];
  }>(path.join(work, "neighbor-audit.json"));
  const neighborClothingSources = new Map<number, FieldEvidence["sources"]>();
  for (const proof of neighborAudit.records) {
    if (proof.collection !== "outfits") continue;
    const id = Number(proof.key);
    const sources = neighborClothingSources.get(id) ?? [];
    sources.push(proof.source);
    neighborClothingSources.set(id, sources);
  }
  const output: FieldEvidence[] = [];
  const add = (
    collection: string,
    id: number,
    fieldPath: string,
    sources: FieldEvidence["sources"],
  ) =>
    output.push({
      entity: { collection, id },
      fieldPath,
      status: "confirmed",
      sources,
      ruleId: "client.catalog.exact_metadata",
      reasonCode: null,
    });
  for (const record of dataset.catalog.records) {
    const row = context.main.get(record.id);
    if (!row) throw new Error(`Missing formal record ${record.id}`);
    const source = (fields: number[]) => ({
      kind: "table" as const,
      file: "prepared/ed.obb",
      table: 318,
      rowOffset: row.rowOffset,
      fields,
    });
    const origin = acquisition(context, record.id);
    if (record.kind === "appearance" || "memberIds" in record)
      output.push({
        entity: { collection: "catalog.records", id: record.id },
        fieldPath: "acquisition",
        status: origin.value === null ? "unresolved" : "confirmed",
        sources: origin.sources.map(tableProof),
        ruleId: "client.catalog.acquisition",
        reasonCode: origin.value === null ? origin.reason : null,
      });
    for (const proof of metadata.record(record.id).proofs)
      output.push({ entity: { collection: "catalog.records", id: record.id }, ...proof });
    const proof = admissions.get(record.id);
    const sources: FieldEvidence["sources"] = proof
      ? proof.admissionSources.map((entry) =>
          entry.kind === "manual"
            ? entry
            : {
                kind: "table",
                file: entry.file,
                table: entry.table,
                rowOffset: entry.rowOffset,
                fields: [0],
              },
        )
      : (neighborClothingSources.get(record.id) ?? []);
    if (record.kind === "seed")
      for (const entry of seedProofs.filter(
        (proof) =>
          (proof.owner === "seed" && proof.id === record.id) ||
          (record.kind === "seed" && proof.owner === "growth" && proof.id === record.growthId),
      ))
        sources.push(...entry.sources.map(tableProof));
    add("catalog.records", record.id, "admissionReasons", sources);
    if (record.kind === "seed" || record.kind === "neighborClothing")
      output.push({
        entity: { collection: "catalog.records", id: record.id },
        fieldPath: "kind",
        status: "confirmed",
        sources: [source([0, 2]), ...sources],
        ruleId:
          record.kind === "seed"
            ? "client.catalog.deterministic_seed"
            : "client.catalog.neighbor_outfit",
        reasonCode: null,
      });
  }
  for (const type of dataset.catalog.clientTypes)
    for (const proof of metadata.clientTypeProofs(type.id))
      output.push({ entity: { collection: "catalog.clientTypes", id: type.id }, ...proof });
  for (const reference of dataset.catalog.references) {
    const row = context.main.get(reference.id);
    if (!row) throw new Error(`Missing reference ${reference.id}`);
    add(
      "catalog.references",
      reference.id,
      "$",
      localizedSources(context.tables, row, [0, 1]).map(tableProof),
    );
  }
  for (const tag of dataset.gameplayTags.tags)
    add("gameplayTags.tags", tag.id, "$", context.gameplayTags.sources(tag.id));
  const recipes = readJson<{
    proofs: {
      id: number;
      sources: { file: string; table: number; rowOffset: number; fields: number[] }[];
    }[];
  }>(path.join(work, "crafting-recipes-audit.json"));
  for (const recipe of recipes.proofs)
    add("catalog.craftingRecipes", recipe.id, "$", recipe.sources.map(tableProof));
  return output;
}
