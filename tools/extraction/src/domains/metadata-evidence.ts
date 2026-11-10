import { localizedSources } from "../extraction/collection/evidence.ts";
import { hashTextKey } from "../extraction/decode/tables.ts";
import { acquisition } from "../extraction/collection/details/client.ts";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { createContentContext } from "../extraction/content/context.ts";
import { readJson } from "../workflow/json.ts";
import type { RecordEvidence } from "../extraction/content/admissions.ts";
import type { CollectionEvidence } from "../extraction/collection/evidence.ts";
import type { BinDataAsset } from "../extraction/types.ts";

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
  const admissions = new Map(
    readJson<RecordEvidence[]>(path.join(work, "record-evidence.json")).map((proof) => [
      proof.id,
      proof,
    ]),
  );
  const seedProofs = readJson<CollectionEvidence[]>(path.join(work, "plant-evidence.json"));
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
    if (record.type === "appearance" || "memberIds" in record)
      output.push({
        entity: { collection: "catalog.records", id: record.id },
        fieldPath: "acquisition",
        status: origin.value === null ? "unresolved" : "confirmed",
        sources: origin.sources.map(tableProof),
        ruleId: "client.catalog.acquisition",
        reasonCode: origin.value === null ? origin.reason : null,
      });
    add("catalog.records", record.id, "clientType", [source([2])]);
    if (record.clientSecondaryType !== null)
      add("catalog.records", record.id, "clientSecondaryType", [source([3])]);
    add("catalog.records", record.id, "gameplayTagGroups", [
      source([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    ]);
    const proof = admissions.get(record.id);
    const sources: FieldEvidence["sources"] =
      proof?.admissionSources.map((entry) =>
        entry.kind === "manual"
          ? entry
          : {
              kind: "table",
              file: entry.file,
              table: entry.table,
              rowOffset: entry.rowOffset,
              fields: [0],
            },
      ) ?? [];
    if (record.type === "seed")
      for (const entry of seedProofs.filter(
        (proof) => proof.owner === "growth" && proof.id === record.id,
      ))
        sources.push(...entry.sources.map(tableProof));
    add("catalog.records", record.id, "admissionReasons", sources);
  }
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
  const manifests = readJson<BinDataAsset[]>(path.join(work, "bindata-manifest.json"));
  const tree = manifests.find((asset) => asset.Name === "633e15d6");
  const display = manifests.find((asset) => asset.Name === "b429c67e");
  if (!tree || !display) throw new Error("Missing GameplayTag provenance");
  const displayData = readJson<
    Record<string, Record<string, { nameInGame?: { textId?: string | null } | null }>>
  >(path.join(work, display.file!));
  const displayMap = Object.values(displayData)[0]!;
  for (const tag of dataset.catalog.gameplayTags) {
    const sources: FieldEvidence["sources"] = [tree, display].map((asset) => ({
      kind: "asset",
      file: asset.Source,
      pathId: String(asset.PathID),
    }));
    const key = displayMap[String(tag.id)]?.nameInGame?.textId;
    const localized = key ? context.tables.textmap[hashTextKey(key)] : undefined;
    if (localized && tag.displayName !== null)
      sources.push({
        kind: "table",
        file: "prepared/ed.obb",
        table: 1,
        rowOffset: localized.rowOffset,
        fields: [1],
      });
    add("catalog.gameplayTags", tag.id, "$", sources);
  }
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
