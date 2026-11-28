import type { ItemOf } from "@loomix/schema/catalog";
import type { TableFieldSource } from "../../../evidence/domain-schema.ts";
import type { SourceProof, WithImageUses } from "../../../model.ts";
import type { TableRow } from "../../../types.ts";
import type { imageCollector } from "../../images.ts";
import { localizedSources, tableSource } from "../collection/evidence.ts";
import type { ContentContext } from "../context.ts";
import { plainText } from "../model.ts";
import { plantIcons } from "./images.ts";
import type { PlantExclusion } from "./read.ts";
import type { ObservedGrowth } from "./schema.ts";

type Stock = ItemOf<"cropPlant" | "flowerPlant">;
type Admission = Pick<Stock, "kind" | "harvestItemId"> & { sources: TableFieldSource[] };

function source(row: TableRow, fields: number[]): TableFieldSource {
  return {
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  };
}

export function readHarvestablePlants(
  context: ContentContext,
  growths: readonly ObservedGrowth[],
  images: Pick<ReturnType<typeof imageCollector>, "need">,
  tagIds: (id: number) => number[],
) {
  const { tables, main, scope } = context;
  const admissions = new Map<number, Admission>();
  const exclusions: PlantExclusion[] = [];
  const crops = tables.byId(144),
    mature = tables.byId(137);
  for (const growth of growths) {
    if (growth.kind !== "crop") continue;
    const crop = crops.get(growth.id)!;
    const products = tables.vector(crop, 10) ?? [];
    for (const { stageId } of growth.matureStages) {
      const stage = mature.get(stageId);
      const harvestItemId = tables.uint(stage, 1);
      if (
        !stage ||
        harvestItemId === null ||
        !products.includes(harvestItemId) ||
        scope.categories.get(harvestItemId) !== "作物"
      )
        throw new Error(`Invalid crop harvest ${growth.id}:${stageId}`);
      const sources = [source(crop, [0, 8, 10]), source(stage, [0, 1])];
      const previous = admissions.get(stageId);
      if (previous && previous.harvestItemId !== harvestItemId)
        throw new Error(`Conflicting crop harvest ${stageId}`);
      if (previous) previous.sources.push(sources[0]);
      else admissions.set(stageId, { kind: "cropPlant", harvestItemId, sources });
    }
  }
  for (const row of mature.values()) {
    const id = tables.id(row);
    if (!admissions.has(id))
      exclusions.push({
        id,
        reason: "outside_admitted_crop_growth",
        sources: [tableSource(tables, row, [0, 1])],
      });
  }
  for (const row of tables.byId(241).values()) {
    const id = tables.id(row);
    const targets = new Set([1, 2].flatMap((field) => tables.uint(row, field) ?? []));
    const harvestItemId = [...targets].find(
      (target) =>
        scope.groups.get(target) === "plants.item" && scope.categories.get(target) === "花",
    );
    const proof = source(row, [0, 1, 2]);
    if (harvestItemId === undefined) {
      exclusions.push({
        id,
        reason: "no_listed_flower",
        sources: [tableSource(tables, row, [0, 1, 2])],
      });
      continue;
    }
    if (targets.size !== 1 || admissions.has(id))
      throw new Error(`Conflicting flower harvest ${id}`);
    admissions.set(id, { kind: "flowerPlant", harvestItemId, sources: [proof] });
  }
  const display = tables.byId(
    325,
    (row) => [
      tables.uint(row, 15, 0),
      tables.uint(row, 27),
      tables.string(row, 4),
      tables.string(row, 5),
    ],
    new Set(admissions.keys()),
  );
  const proofs: SourceProof[] = [];
  const items = [...admissions].map(
    ([id, { kind, harvestItemId, sources }]): WithImageUses<Stock> => {
      const row = main.get(id),
        ui = display.get(id);
      const name = plainText(tables.text(row, 1));
      if (!row || !name) throw new Error(`Missing harvestable plant identity ${id}`);
      const description = plainText(tables.text(ui, 27));
      const quality = ui ? tables.uint(ui, 15, 0) : null;
      const localized = (entry: TableRow | undefined, fields: number[]) =>
        localizedSources(tables, entry, fields).map(({ file, table, rowOffset, fields }) => ({
          kind: "table" as const,
          file,
          table,
          rowOffset,
          fields,
        }));
      for (const [field, value, evidence] of [
        ["kind", kind, sources],
        ["harvestItemId", harvestItemId, sources],
        ["name", name, localized(row, [0, 1])],
        ["description", description, localized(ui, [0, 27])],
        ["quality", quality, ui ? [source(ui, [0, 15])] : []],
      ] as const) {
        proofs.push({
          owner: "item",
          id,
          field,
          status: value === null ? "unresolved" : "confirmed",
          sources: evidence,
          ruleId: "client.plants.harvestable",
          reasonCode: value === null ? "display_field_unresolved" : null,
        });
      }
      const icons = plantIcons(context, id, ui);
      const use = images.need(
        { kind: "item", id, field: "image" },
        icons.matches,
        "icon",
        ui ? [source(ui, [0, 4, 5])] : [{ kind: "tableScan", file: "prepared/ed.obb", table: 325 }],
        "plant_image_not_configured_or_matched",
        false,
        icons.references.flatMap((icon) => icon.reference || []),
      );
      return {
        kind,
        id,
        name,
        harvestItemId,
        description,
        quality,
        tagIds: tagIds(id),
        image: { use },
      };
    },
  );
  return { items, proofs, exclusions };
}
