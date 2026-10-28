import type { CatalogRecord } from "../../schema.ts";
import type { CollectionDetail, CropSeedDetail } from "../../schema.ts";
import { emptyCollectionDetail, emptyCropSeedDetail } from "../../schema.ts";
import type { ContentContext } from "../../content/context.ts";
import { plainText } from "../../content/model.ts";
import type { CollectionEvidenceBuilder, CollectionSource } from "../evidence.ts";
import { localizedSources, tableSource } from "../evidence.ts";
import type { TableRow } from "../../types.ts";

export interface DetailResult<T> {
  value: T;
  sources: CollectionSource[];
  reason: string;
}

export function acquisition(context: ContentContext, id: number) {
  const { tables, vocabulary } = context;
  const rows = tables.rows(325).filter((row) => tables.id(row) === id);
  const signatures = rows.map((row) => JSON.stringify(tables.vector(row, 2)));
  if (new Set(signatures).size > 1) throw new Error(`Conflicting source vectors ${id}`);
  const row = rows[0];
  const codes = tables.vector(row, 2);
  const sources = row ? [tableSource(tables, row, [0, 2])] : [];
  const value = codes?.length
    ? codes.map((sourceId) => {
        const source = vocabulary.sources.get(sourceId);
        sources.push(...localizedSources(tables, source, [0, 1]));
        const label = plainText(tables.text(source, 1));
        if (!label || sourceId <= 0) return null;
        return { sourceId, label, condition: null };
      })
    : null;
  return {
    value: value?.every((entry) => entry !== null) ? value : null,
    sources,
    reason: "source_condition_configuration_unconfirmed",
  };
}

export function growth(context: ContentContext, row: TableRow | undefined) {
  const { tables } = context;
  const sources = row ? [tableSource(tables, row, [0, 3, 4, 5, 6, 8, 9, 10])] : [];
  const stageIds = row
    ? [
        ...(tables.vector(row, 4) ?? []),
        ...(tables.vector(row, 6) ?? []),
        ...(tables.vector(row, 8) ?? []),
        ...(tables.uint(row, 9) === null ? [] : [tables.uint(row, 9)!]),
      ]
    : [];
  const uniqueStageIds = [...new Set(stageIds)];
  const stageDetails = row
    ? uniqueStageIds.map((id) => {
        const display = tables.byId(318).get(id);
        return { id, name: plainText(tables.text(display, 1)), image: null };
      })
    : null;
  const matureStageIds = tables.vector(row, 8);
  const matureStages =
    matureStageIds?.map((entityId) => {
      const stage = tables.byId(137).get(entityId);
      if (!stage) throw new Error(`Unresolved mature crop stage ${entityId}`);
      const productId = tables.uint(stage, 1);
      if (!productId || !tables.vector(row, 10)?.includes(productId))
        throw new Error(`Mature crop stage product mismatch ${entityId}`);
      sources.push(tableSource(tables, stage, [0, 1, 2, 3]));
      return { entityId, productId, tag: tables.string(stage, 2), rank: tables.string(stage, 3) };
    }) ?? null;
  return {
    value: row
      ? {
          cycleMode: tables.string(row, 3),
          stageIds: tables.vector(row, 4),
          regrowthStageIds: tables.vector(row, 6),
          stages: stageDetails,
          matureStages,
          witheredStageId: tables.uint(row, 9),
          maturityDays: null,
          harvestCount: tables.uint(row, 5),
        }
      : null,
    sources,
    reason: "stage_cycle_does_not_confirm_elapsed_days",
  };
}

export function treeDrops(
  context: ContentContext,
  id: number,
): DetailResult<CollectionDetail["treeDrops"]> {
  const { tables } = context;
  const tree = tables.byId(708).get(id);
  if (!tree) return { value: null, sources: [], reason: "no_tree_configuration" };
  const sources = [tableSource(tables, tree, [0, 1, 2, 3, 5])];
  const groupId = tables.uint(tree, 5);
  const rows = tables.rows(563).filter((row) => tables.uint(row, 0) === groupId);
  const value: NonNullable<CollectionDetail["treeDrops"]> = [];
  const fruitId = tables.uint(tree, 1);
  if (fruitId !== null)
    value.push({
      itemId: fruitId,
      dropGroupId: null,
      weight: null,
      quantityMin: null,
      quantityMax: null,
      probability: null,
    });
  for (const row of rows) {
    const itemId = tables.uint(row, 2);
    if (!itemId || !context.main.has(itemId))
      throw new Error(`Unresolved tree drop item ${id}:${itemId}`);
    sources.push(tableSource(tables, row, [0, 1, 2, 3, 4, 5, 15]));
    value.push({
      itemId,
      dropGroupId: groupId,
      weight: tables.uint(row, 5),
      quantityMin: null,
      quantityMax: null,
      probability: null,
    });
  }
  return {
    value: value.length ? value : null,
    sources,
    reason: "drop_quantity_and_probability_semantics_unconfirmed",
  };
}

export function dishEffects(
  context: ContentContext,
  id: number,
): DetailResult<CollectionDetail["dishEffects"]> {
  const { tables } = context;
  const recipe = context.recipesByProduct.get(id);
  const sources = recipe ? [tableSource(tables, recipe, [0, 4, 6, 7, 8])] : [];
  const raw = tables.string(recipe, 6);
  if (!raw) return { value: null, sources, reason: "special_effect_not_configured_in_recipe" };
  if (!/^\d+(?:[,;]\d+)*$/.test(raw))
    throw new Error(`Unsupported recipe effect list ${id}: ${raw}`);
  const buffs = tables.byId(70);
  const value = raw.split(/[,;]/).map((code) => {
    const effectId = Number(code);
    const buff = buffs.get(effectId);
    if (!buff) throw new Error(`Unknown recipe effect ${id}:${effectId}`);
    sources.push(...localizedSources(tables, buff, [0, 1, 4, 10, 19]));
    const name = plainText(tables.text(buff, 1));
    const description = plainText(tables.text(buff, 19));
    const tier = name?.match(/([一二三])阶/);
    const uses = description?.match(/(\d+)次内有效/);
    const duration = description?.match(/(?:生效时长|排空时长)：(\d+)秒/);
    const durationSeconds = duration ? Number(duration[1]) : null;
    if (durationSeconds !== null && tables.uint(buff, 4) !== durationSeconds)
      throw new Error(`Effect duration disagrees with client text ${effectId}`);
    const useCount = uses ? Number(uses[1]) : null;
    if (useCount !== null && tables.uint(buff, 10) !== useCount)
      throw new Error(`Effect uses disagree with client text ${effectId}`);
    return {
      effectId,
      name,
      description,
      level: tier ? "一二三".indexOf(tier[1]!) + 1 : null,
      uses: useCount,
      durationSeconds,
    };
  });
  return { value, sources, reason: "effect_parameter_not_explicit_in_client_configuration" };
}

export function trade(
  context: ContentContext,
  id: number,
): DetailResult<CollectionDetail["trade"]> {
  const { tables } = context;
  const rows = tables.rows(659).filter((row) => tables.uint(row, 2) === id);
  const sources: CollectionSource[] = [];
  const offers = rows
    .map((row) => {
      sources.push(tableSource(tables, row, [0, 1, 2, 9, 10, 12, 13, 17, 18, 22, 23, 24]));
      const goodsGroupId = tables.uint(row, 1);
      if (!goodsGroupId) throw new Error(`Missing goods group ${tables.id(row)}`);
      const conditions = [17, 23].flatMap((field) => {
        const kind = tables.string(row, field);
        if (!kind) return [];
        if (!kind.startsWith("SHOP_SALE_CONDITION_"))
          throw new Error(`Unknown shop condition ${kind}`);
        return [{ field, kind, parameters: tables.string(row, field + 1) }];
      });
      return {
        id: tables.id(row),
        goodsGroupId,
        buyPrice: null,
        currencyItemId: null,
        stock: null,
        refresh: null,
        conditions: conditions.length ? conditions : null,
      };
    })
    .sort((a, b) => a.id - b.id);
  if (new Set(offers.map((offer) => offer.id)).size !== offers.length)
    throw new Error(`Duplicate shop offer IDs for ${id}`);
  return {
    value: offers.length ? { sellPrice: null, offers } : null,
    sources,
    reason: "commerce_price_stock_refresh_mapping_unconfirmed",
  };
}

export function recordDetail<T>(
  proofs: CollectionEvidenceBuilder,
  owner: "item" | "seed",
  id: number,
  field: string,
  result: DetailResult<T | null>,
) {
  const put = (path: string, value: unknown) => {
    proofs.put(
      owner,
      id,
      path,
      value,
      result.sources,
      "Explicit client configuration ID/reference join; no name-based association",
      "Preserve client values; do not infer units, runtime probabilities, or missing defaults",
      result.reason,
    );
  };
  put(field, result.value);
}

export function buildItemDetail(
  context: ContentContext,
  record: CatalogRecord,
  proofs: CollectionEvidenceBuilder,
) {
  const detail = emptyCollectionDetail(record.id);
  if (record.kind === "item") {
    const source = acquisition(context, record.id);
    detail.acquisitionConditions = source.value;
    recordDetail(proofs, "item", record.id, "detail.acquisitionConditions", source);
    const commerce = trade(context, record.id);
    detail.trade = commerce.value;
    recordDetail(proofs, "item", record.id, "detail.trade", commerce);
    if (record.category === "plants") {
      const main = context.main.get(record.id);
      if (record.subcategory === "花") {
        const tags = context.vocabulary.tags(main, 9);
        const colors = tags.map((tag) => context.vocabulary.translateTag(tag));
        detail.flowerColors =
          tags.length && colors.every(Boolean)
            ? [...new Set(colors.filter((value): value is string => value !== null))]
            : null;
        recordDetail(proofs, "item", record.id, "detail.flowerColors", {
          value: detail.flowerColors,
          sources: main ? [tableSource(context.tables, main, [0, 9])] : [],
          reason: tags.length ? "color_tag_unresolved" : "flower_color_tag_not_configured",
        });
        const candidates = context.tables
          .rows(241)
          .filter((row) =>
            [1, 2, 3].some((field) => context.tables.uint(row, field) === record.id),
          );
        const groups = context.tables
          .rows(244)
          .filter((row) => context.tables.vector(row, 2)?.includes(record.id) ?? false);
        recordDetail(proofs, "item", record.id, "detail.hybridRecipes", {
          value: null,
          sources: [
            ...candidates.map((row) => tableSource(context.tables, row, [0, 1, 2, 3])),
            ...groups.map((row) => tableSource(context.tables, row, [0, 1, 2])),
          ],
          reason: "client_flower_mappings_do_not_confirm_parent_to_offspring_recipe",
        });
      }
      const growing = growth(context, context.vocabulary.cropsByProduct.get(record.id));
      detail.growth = growing.value;
      if (growing.value) recordDetail(proofs, "item", record.id, "detail.growth", growing);
      const drops = treeDrops(context, record.id);
      detail.treeDrops = drops.value;
      if (drops.value) recordDetail(proofs, "item", record.id, "detail.treeDrops", drops);
    }
    if (record.category === "creatures") {
      const scale = context.vocabulary.scales.get(record.id);
      const ui = context.ui.get(record.id);
      recordDetail(proofs, "item", record.id, "detail.creatureSize", {
        value: null,
        sources: scale ? [tableSource(context.tables, scale, [0, 3, 4, 5, 6])] : [],
        reason: "native_scale_endpoints_do_not_prove_display_unit_conversion",
      });
      recordDetail(proofs, "item", record.id, "detail.creatureGrades", {
        value: null,
        sources: ui ? [tableSource(context.tables, ui, [0, 12, 14])] : [],
        reason: "per_star_size_score_and_sale_rules_not_confirmed",
      });
    }
    if (record.category === "dishes") {
      const effects = dishEffects(context, record.id);
      detail.dishEffects = effects.value;
      recordDetail(proofs, "item", record.id, "detail.dishEffects", effects);
    }
  }
  const written = new Set(
    proofs.records
      .filter((proof) => proof.owner === "item" && proof.id === record.id)
      .map((proof) => proof.field),
  );
  for (const [field, value] of Object.entries(detail)) {
    if (field === "id" || written.has(`detail.${field}`)) continue;
    proofs.put(
      "item",
      record.id,
      `detail.${field}`,
      value,
      [],
      "No independently confirmed client mapping for this field",
      "Keep unknown or inapplicable category details null; candidates remain in the investigation audit",
      record.kind !== "item" ? "not_an_item" : `${field}_mapping_unconfirmed_or_inapplicable`,
    );
  }
  return detail;
}

export function buildSeedDetail(
  context: ContentContext,
  row: TableRow,
  proofs: CollectionEvidenceBuilder,
): CropSeedDetail {
  const { tables } = context;
  const id = context.tables.id(row);
  const detail = emptyCropSeedDetail(id);
  const growing = growth(context, row);
  const display = context.tables.rows(325).find((entry) => context.tables.id(entry) === id);
  detail.description = plainText(context.tables.text(display, 27));
  detail.quality = display ? context.tables.uint(display, 15) : null;
  for (const field of ["description", "quality"] as const)
    recordDetail(proofs, "seed", id, `detail.${field}`, {
      value: detail[field],
      sources: localizedSources(context.tables, display, [0, 15, 27]),
      reason: "seed_display_configuration_missing",
    });
  detail.growth = growing.value;
  recordDetail(proofs, "seed", id, "detail.growth", growing);
  detail.stageIds = tables.vector(row, 4);
  detail.harvestCount = tables.uint(row, 5);
  for (const field of ["stageIds", "harvestCount"] as const)
    recordDetail(proofs, "seed", id, `detail.${field}`, {
      value: detail[field],
      sources: [tableSource(tables, row, field === "stageIds" ? [0, 4] : [0, 5])],
      reason: "crop_stage_configuration_missing",
    });
  recordDetail(proofs, "seed", id, "detail.maturityDays", {
    value: null,
    sources: [tableSource(tables, row, [0, 3, 4])],
    reason: "cycle_and_stage_order_do_not_confirm_elapsed_days",
  });
  const commerce = trade(context, id);
  detail.trade = commerce.value;
  recordDetail(proofs, "seed", id, "detail.trade", commerce);
  const sources = acquisition(context, id);
  detail.acquisitionConditions = sources.value;
  recordDetail(proofs, "seed", id, "detail.acquisitionConditions", sources);
  return detail;
}
