import { z } from "zod";
import type { ContentContext } from "../../content/context.ts";
import { collectionSourceSchema, tableSource } from "../evidence.ts";
import { catalogSource } from "../../../profile.ts";

export const detailInvestigationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  source: z.strictObject({
    gameVersion: z.string(),
    dataRevision: z.number(),
    resourceRevision: z.number(),
  }),
  records: z.array(
    z.strictObject({
      id: z.number().int().positive(),
      field: z.string().min(1),
      status: z.literal("unconfirmed"),
      reason: z.string().min(1),
      candidates: z.json(),
      sources: collectionSourceSchema.array(),
    }),
  ),
});

export function detailInvestigation(context: ContentContext) {
  const { tables, scope } = context;
  const records: z.infer<typeof detailInvestigationSchema>["records"] = [];
  for (const [id, group] of scope.groups) {
    const display = context.ui.get(id);
    const sourceIds = tables.vector(display, 2) ?? [];
    if (sourceIds.length)
      records.push({
        id,
        field: "detail.acquisitionConditions",
        status: "unconfirmed",
        reason: "source_labels_do_not_describe_exact_unlock_or_spawn_conditions",
        candidates: {
          sources: sourceIds.map((sourceId) => {
            const source = tables.byId(618).get(sourceId);
            return {
              sourceId,
              label: tables.text(source, 1),
              nativeConditionText: tables.string(source, 2),
              nativeParameters: tables.vector(source, 2),
              nativeType: tables.uint(source, 3),
            };
          }),
        },
        sources: [
          ...(display ? [tableSource(tables, display, [0, 2])] : []),
          ...sourceIds.flatMap((sourceId) => {
            const source = tables.byId(618).get(sourceId);
            return source ? [tableSource(tables, source, [0, 1, 2, 3])] : [];
          }),
        ],
      });
    if (group === "creatures.item") {
      const scale = tables.byId(132).get(id);
      const ui = context.ui.get(id);
      records.push({
        id,
        field: "detail.creatureSize",
        status: "unconfirmed",
        reason: "native_scale_endpoints_do_not_prove_display_unit_conversion",
        candidates: {
          min: tables.uint(scale, 4),
          max: tables.uint(scale, 5),
          scale: tables.float(scale, 3),
          extraScale: tables.float(scale, 6),
        },
        sources: scale ? [tableSource(tables, scale, [0, 3, 4, 5, 6])] : [],
      });
      records.push({
        id,
        field: "detail.creatureGrades",
        status: "unconfirmed",
        reason: "per_star_size_score_and_sale_rules_not_confirmed",
        candidates: {
          displaySaleCandidate: tables.uint(ui, 14),
          gradeCandidate: tables.uint(ui, 12),
        },
        sources: ui ? [tableSource(tables, ui, [0, 12, 14])] : [],
      });
    }
    if (group === "plants.item") {
      const flowerRows = tables
        .rows(241)
        .filter((row) => [1, 2, 3].some((field) => tables.uint(row, field) === id));
      const flowerGroupRows = tables
        .rows(244)
        .filter((row) => tables.vector(row, 2)?.includes(id) ?? false);
      records.push({
        id,
        field: "detail.hybridRecipes",
        status: "unconfirmed",
        reason: "client_flower_mappings_do_not_confirm_parent_to_offspring_recipe",
        candidates: {
          relationTable241: flowerRows.map((row) => ({
            id: tables.id(row),
            fields: [1, 2, 3].map((field) => tables.uint(row, field)),
          })),
          groupTable244: flowerGroupRows.map((row) => ({
            id: tables.id(row),
            group: tables.uint(row, 1),
            members: tables.vector(row, 2),
          })),
        },
        sources: [
          ...flowerRows.map((row) => tableSource(tables, row, [0, 1, 2, 3])),
          ...flowerGroupRows.map((row) => tableSource(tables, row, [0, 1, 2])),
        ],
      });
      const crop = context.vocabulary.cropsByProduct.get(id);
      if (crop)
        records.push({
          id,
          field: "detail.growth.maturityDays",
          status: "unconfirmed",
          reason: "cycle_and_stage_order_are_not_elapsed_day_confirmation",
          candidates: {
            cycleMode: tables.string(crop, 3),
            initialStages: tables.vector(crop, 4),
            regrowthStages: tables.vector(crop, 6),
          },
          sources: [tableSource(tables, crop, [0, 3, 4, 6, 10])],
        });
      const tree = tables.byId(708).get(id);
      if (tree)
        records.push({
          id,
          field: "detail.treeDrops",
          status: "unconfirmed",
          reason: "fruit_count_weights_and_drop_runtime_rules_need_independent_confirmation",
          candidates: {
            fruitId: tables.uint(tree, 1),
            fruitCountCandidate: tables.uint(tree, 2),
            fruitWeights: tables.string(tree, 3),
            dropGroupId: tables.uint(tree, 5),
          },
          sources: [tableSource(tables, tree, [0, 1, 2, 3, 5])],
        });
    }
  }
  const ids = new Set([...scope.ids, ...tables.rows(144).map((row) => tables.id(row))]);
  for (const row of tables.rows(659)) {
    const id = tables.uint(row, 2);
    if (!id || !ids.has(id)) continue;
    records.push({
      id,
      field: "detail.trade",
      status: "unconfirmed",
      reason: "price_currency_stock_reset_semantics_not_independently_verified",
      candidates: {
        offerId: tables.id(row),
        goodsGroupId: tables.uint(row, 1),
        numericCandidates: [6, 7, 8, 9, 10, 12, 13, 21, 22].map((field) => ({
          field,
          nativeValue: tables.uint(row, field),
        })),
        conditionCandidates: [17, 18, 23, 24].map((field) => ({
          field,
          nativeValue: tables.string(row, field),
        })),
      },
      sources: [
        tableSource(tables, row, [0, 1, 2, 6, 7, 8, 9, 10, 12, 13, 17, 18, 21, 22, 23, 24]),
      ],
    });
  }
  return detailInvestigationSchema.parse({ schemaVersion: 1, source: catalogSource, records });
}
