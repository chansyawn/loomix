import { z } from "zod";
import { IdSchema, SourceSchema } from "@loomix/schema/common";
import type { Source } from "@loomix/schema/common";
import { FlowerHybridizationRecipeSchema } from "@loomix/schema/catalog";
import type { Catalog, FlowerHybridizationRecipe } from "@loomix/schema/catalog";
import { digest } from "../../workflow/hashing.ts";
import type { FieldEvidence } from "../evidence/domain-schema.ts";

export const flowerHybridizationFile = "external/flower-hybridization.json";

const targetSchema = SourceSchema.pick({ gameVersion: true, dataRevision: true });
const inputSchema = z.strictObject({
  target: targetSchema,
  recipes: FlowerHybridizationRecipeSchema.extend({ seriesId: IdSchema }).array(),
});

export interface FrozenFlowerHybridization {
  recipes: z.infer<typeof inputSchema>["recipes"];
  sha256: string;
}

export function parseFlowerHybridization(
  bytes: Uint8Array,
  expected: Pick<Source, "gameVersion" | "dataRevision">,
): FrozenFlowerHybridization {
  try {
    const data = inputSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
    if (
      data.target.gameVersion !== expected.gameVersion ||
      data.target.dataRevision !== expected.dataRevision
    )
      throw new Error(
        `目标客户端应为 ${expected.gameVersion}（数据修订 ${expected.dataRevision}），实际为 ${data.target.gameVersion}（数据修订 ${data.target.dataRevision}）`,
      );
    const seen = new Set<string>();
    const recipes = data.recipes.map(({ seriesId, parentItemIds, productItemId }) => {
      const [first, second] = parentItemIds;
      const parents: [number, number] = first <= second ? [first, second] : [second, first];
      const key = `${seriesId}:${parents[0]}:${parents[1]}:${productItemId}`;
      if (seen.has(key)) throw new Error(`重复杂交配方 ${key}`);
      seen.add(key);
      return { seriesId, parentItemIds: parents, productItemId };
    });
    return { recipes, sha256: digest(bytes) };
  } catch (error) {
    throw new Error(`${flowerHybridizationFile}: ${String(error)}`, { cause: error });
  }
}

function compareRecipes(left: FlowerHybridizationRecipe, right: FlowerHybridizationRecipe): number {
  return (
    left.parentItemIds[0] - right.parentItemIds[0] ||
    left.parentItemIds[1] - right.parentItemIds[1] ||
    left.productItemId - right.productItemId
  );
}

export function assembleFlowerHybridization(catalog: Catalog, input: FrozenFlowerHybridization) {
  const collections = new Map(catalog.collections.map((collection) => [collection.id, collection]));
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const bySeries = new Map<number, { recipe: FlowerHybridizationRecipe; pointer: string }[]>();
  for (const [index, { seriesId, ...recipe }] of input.recipes.entries()) {
    const collection = collections.get(seriesId);
    if (collection?.memberKind !== "plant")
      throw new Error(`${flowerHybridizationFile}: 未知植物系列 ${seriesId}`);
    for (const id of [...recipe.parentItemIds, recipe.productItemId]) {
      const item = items.get(id);
      if (item?.kind !== "plant" || item.category !== "花" || !collection.memberIds?.includes(id))
        throw new Error(`${flowerHybridizationFile}: 物品 ${id} 不是系列 ${seriesId} 的正式花朵`);
    }
    const entries = bySeries.get(seriesId) ?? [];
    entries.push({ recipe, pointer: `/recipes/${index}` });
    bySeries.set(seriesId, entries);
  }

  const fields: FieldEvidence[] = [];
  const enriched = catalog.collections.map((collection) => {
    const entries = bySeries
      .get(collection.id)
      ?.sort((left, right) => compareRecipes(left.recipe, right.recipe));
    const entity = { collection: "catalog.collections", id: collection.id };
    const fieldPath = "flowerHybridization";
    const ruleId = "external.flower_hybridization";
    if (entries) {
      const sources = entries.map(({ pointer }) => ({
        kind: "manual" as const,
        file: flowerHybridizationFile,
        pointer,
        sha256: input.sha256,
      }));
      fields.push({ entity, fieldPath, status: "confirmed", sources, ruleId, reasonCode: null });
      sources.forEach((source, index) =>
        fields.push({
          entity,
          fieldPath: `${fieldPath}.${index}`,
          status: "confirmed",
          sources: [source],
          ruleId,
          reasonCode: null,
        }),
      );
    } else {
      const plant = collection.memberKind === "plant";
      fields.push({
        entity,
        fieldPath,
        status: plant ? "unresolved" : "absent",
        sources: [],
        ruleId,
        reasonCode: plant ? "no_reviewed_recipe" : "not_plant_collection",
      });
    }
    return { ...collection, flowerHybridization: entries?.map(({ recipe }) => recipe) ?? null };
  });
  return { catalog: { ...catalog, collections: enriched }, fields };
}
