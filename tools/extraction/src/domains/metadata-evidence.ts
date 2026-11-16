import { readCatalogMetadata } from "../source/client/catalog-metadata.ts";
import { localizedSources, tableSource } from "../extraction/collection/evidence.ts";
import { acquisition } from "../extraction/collection/details/client.ts";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { createContentContext } from "../extraction/content/context.ts";
import { readJson } from "../workflow/json.ts";
import type { RecordEvidence } from "../extraction/content/admissions.ts";
import type { CollectionEvidence } from "../extraction/collection/evidence.ts";
import { profile } from "../profile.ts";

type Source = FieldEvidence["sources"][number];

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
}): Source {
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
    records: { collection: string; key: string; source: Source }[];
  }>(path.join(work, "neighbor-audit.json"));
  const neighborClothingSources = new Map<number, Source[]>();
  for (const proof of neighborAudit.records) {
    if (proof.collection !== "outfits") continue;
    const id = Number(proof.key);
    neighborClothingSources.set(id, [...(neighborClothingSources.get(id) ?? []), proof.source]);
  }
  const output: FieldEvidence[] = [];
  const admissionSources = (id: number): Source[] => {
    const proof = admissions.get(id);
    return proof
      ? proof.admissionSources.map((entry) =>
          entry.kind === "manual"
            ? entry
            : tableProof({
                file: entry.file,
                table: entry.table,
                rowOffset: entry.rowOffset,
                fields: [0],
              }),
        )
      : (neighborClothingSources.get(id) ?? []);
  };
  for (const collection of dataset.catalog.collections) {
    const origin = acquisition(context, collection.id);
    output.push({
      entity: { collection: "catalog.collections", id: collection.id },
      fieldPath: "acquisition",
      status: origin.value === null ? "unresolved" : "confirmed",
      sources: origin.sources.map(tableProof),
      ruleId: "client.catalog.acquisition",
      reasonCode: origin.value === null ? origin.reason : null,
    });
  }
  for (const item of dataset.catalog.items) {
    const entity = { collection: "catalog.items", id: item.id };
    const row = context.main.get(item.id);
    if (!row) throw new Error(`Missing catalog item ${item.id}`);
    if (item.kind === "reference") {
      output.push({
        entity,
        fieldPath: "name",
        status: "confirmed",
        sources: [
          tableSource(context.tables, row, [0]),
          ...localizedSources(context.tables, row, [1]),
        ].map(tableProof),
        ruleId: "client.catalog.reference_details",
        reasonCode: null,
      });
      const sources = context.tables
        .rows(profile.roots.ui)
        .filter((ui) => context.tables.id(ui) === item.id)
        .flatMap((ui) =>
          [
            tableSource(context.tables, ui, [0]),
            ...localizedSources(context.tables, ui, [profile.fields.ui.description]),
          ].map(tableProof),
        );
      output.push({
        entity,
        fieldPath: "description",
        status: item.description === null ? "absent" : "confirmed",
        sources: sources.length ? sources : [tableProof(tableSource(context.tables, row, [0]))],
        ruleId: "client.catalog.reference_details",
        reasonCode: item.description === null ? "item_detail_not_configured" : null,
      });
      continue;
    }
    if (item.kind === "appearance") {
      const origin = acquisition(context, item.id);
      output.push({
        entity,
        fieldPath: "acquisition",
        status: origin.value === null ? "unresolved" : "confirmed",
        sources: origin.sources.map(tableProof),
        ruleId: "client.catalog.acquisition",
        reasonCode: origin.value === null ? origin.reason : null,
      });
    }
    for (const proof of metadata.record(item.id).proofs) output.push({ entity, ...proof });
    if (item.kind === "seed" || item.kind === "neighborClothing") {
      const sources = admissionSources(item.id);
      if (item.kind === "seed")
        for (const proof of seedProofs.filter(
          (proof) => (proof.owner === "seed" || proof.owner === "growth") && proof.id === item.id,
        ))
          sources.push(...proof.sources.map(tableProof));
      output.push({
        entity,
        fieldPath: "kind",
        status: "confirmed",
        sources: [tableProof(tableSource(context.tables, row, [0, 2])), ...sources],
        ruleId:
          item.kind === "seed"
            ? "client.catalog.deterministic_seed"
            : "client.catalog.neighbor_outfit",
        reasonCode: null,
      });
    }
  }
  for (const tag of dataset.gameplayTags.tags)
    output.push({
      entity: { collection: "gameplayTags.tags", id: tag.id },
      fieldPath: "$",
      status: "confirmed",
      sources: context.gameplayTags.sources(tag.id),
      ruleId: "client.catalog.exact_metadata",
      reasonCode: null,
    });
  const recipes = readJson<{
    proofs: {
      id: number;
      sources: { file: string; table: number; rowOffset: number; fields: number[] }[];
    }[];
  }>(path.join(work, "crafting-recipes-audit.json"));
  const recipeOwners = new Map(
    dataset.catalog.items.flatMap((item) =>
      item.kind === "furniture"
        ? item.craftingRecipes.map((recipe, index) => [recipe.id, { id: item.id, index }] as const)
        : [],
    ),
  );
  for (const recipe of recipes.proofs) {
    const owner = recipeOwners.get(recipe.id);
    if (!owner) throw new Error(`Crafting recipe ${recipe.id} is missing from its product`);
    output.push({
      entity: { collection: "catalog.items", id: owner.id },
      fieldPath: `craftingRecipes.${owner.index}`,
      status: "confirmed",
      sources: recipe.sources.map(tableProof),
      ruleId: "client.catalog.exact_metadata",
      reasonCode: null,
    });
  }
  return output;
}
