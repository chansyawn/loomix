import type { CatalogRecord } from "../../../../schema.ts";
import type { CollectionDetail } from "../../../../schema.ts";
import { emptyCollectionDetail } from "../../../../schema.ts";
import type { ContentContext } from "../../context.ts";
import { plainText, scaledCreatureSize } from "../../model.ts";
import type { CollectionEvidenceBuilder, CollectionSource } from "../evidence.ts";
import { localizedSources, tableSource } from "../evidence.ts";

import { treeDrops } from "./tree-drops.ts";

export interface DetailResult<T> {
  value: T;
  sources: CollectionSource[];
  reason: string;
}

export function creatureSize(
  context: ContentContext,
  id: number,
): DetailResult<CollectionDetail["creatureSize"]> {
  const { tables } = context;
  const scale = context.vocabulary.scales.get(id);
  const min = tables.uint(scale, 4);
  const max = tables.uint(scale, 5);
  const multiplier = tables.float(scale, 6);
  const sources = scale ? [tableSource(tables, scale, [0, 3, 4, 5, 6])] : [];
  if (min !== null && max !== null && min > max)
    throw new Error(`Creature minimum size exceeds maximum ${id}`);
  return {
    value: scaledCreatureSize(min, max, multiplier),
    sources,
    reason: "creature_size_configuration_missing",
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
      field === "detail.treeDrops"
        ? "保留客户端条目；模式 2 的概率按条目权重除以整组总权重计算；不推断果实概率、数量和运行限制"
        : "Preserve client values; do not infer units, runtime probabilities, or missing defaults",
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
      const drops = treeDrops(context, record.id);
      detail.treeDrops = drops.value;
      if (drops.value) recordDetail(proofs, "item", record.id, "detail.treeDrops", drops);
    }
    if (record.category === "creatures") {
      const size = creatureSize(context, record.id);
      const ui = context.ui.get(record.id);
      detail.creatureSize = size.value;
      proofs.put(
        "item",
        record.id,
        "detail.creatureSize",
        size.value,
        size.sources,
        "132.0 = catalog item ID",
        "Multiply 132.4/5 endpoints by 132.6 to obtain the displayed 厘 range; 132.3 is not used",
        size.reason,
      );
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
