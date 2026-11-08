import type { ContentContext } from "../content/context.ts";
import type { TableRow } from "../types.ts";
import type { ObservedGrowth } from "./schema.ts";
import { plainText } from "../content/model.ts";
import { tableSource } from "../collection/evidence.ts";

export type PlantingContext = Pick<ContentContext, "tables" | "main" | "scope" | "vocabulary">;
export function plantingItemName(context: PlantingContext, id: number) {
  const name = plainText(context.tables.text(context.main.get(id), 1));
  if (!context.main.has(id) || !name) throw new Error(`Missing plant item/name ${id}`);
  return name;
}

export function readCropGrowth(context: PlantingContext, crop: TableRow) {
  const { tables, scope } = context;
  const id = tables.id(crop);
  const products = tables.vector(crop, 10) ?? [];
  if (!products.every((product) => scope.groups.get(product) === "plants.item"))
    throw new Error(`Crop has nonformal products ${id}`);
  const sources = [tableSource(tables, crop, [0, 3, 4, 5, 6, 8, 9, 10])];
  const mature = tables.byId(137);
  const matureIds = tables.vector(crop, 8) ?? [];
  const stagePlants = new Map<number, number>();
  const matureStages = matureIds.map((stageId) => {
    const row = mature.get(stageId);
    const product = tables.uint(row, 1);
    if (!row || product === null || !products.includes(product))
      throw new Error(`Mature crop stage product mismatch ${id}:${stageId}`);
    sources.push(tableSource(tables, row, [0, 1, 2, 3]));
    stagePlants.set(stageId, product);
    return { stageId, tag: tables.string(row, 2), rank: tables.string(row, 3) };
  });
  if (new Set(stagePlants.values()).size !== products.length)
    throw new Error(`Incomplete crop products ${id}`);
  const initialStageIds = tables.vector(crop, 4) ?? [];
  const regrowthStageIds = tables.vector(crop, 6);
  const witheredStageId = tables.uint(crop, 9);
  const stageIds = [
    ...new Set([
      ...initialStageIds,
      ...(regrowthStageIds ?? []),
      ...matureIds,
      ...(witheredStageId === null ? [] : [witheredStageId]),
    ]),
  ].sort((a, b) => a - b);
  const growth: ObservedGrowth = {
    id,
    kind: "crop",
    maturityDays: null,
    cycleMode: tables.string(crop, 3),
    initialStageIds,
    regrowthStageIds,
    matureStages,
    witheredStageId,
    harvestCount: tables.uint(crop, 5),
    stages: stageIds.map((stageId) => ({
      id: stageId,
      name: plantingItemName(context, stageId),
      image: null,
      plantId: stagePlants.get(stageId) ?? null,
    })),
  };
  return { growth, sources };
}

export function readStagedGrowth(context: PlantingContext, id: number, use: TableRow) {
  const { tables, scope } = context;
  const parameter = tables.string(use, 2);
  if (!parameter || !/^[1-9]\d*$/.test(parameter) || !Number.isSafeInteger(Number(parameter)))
    throw new Error(`Invalid seed parameter ${id}:${parameter}`);
  const links = tables.byId(709),
    flowers = tables.byId(241);
  const sources = [tableSource(tables, use, [0, 1, 2])];
  const investigation: {
    id: number;
    fields: { field: number; value: number | null }[];
    source: ReturnType<typeof tableSource>;
  }[] = [];
  const stages: ObservedGrowth["stages"] = [];
  const seen = new Set<number>();
  let stageId: number | null = Number(parameter);
  while (stageId !== null) {
    if (seen.has(stageId)) throw new Error(`Plant growth cycle ${id}:${stageId}`);
    seen.add(stageId);
    const targets: Set<number> = new Set(
      scope.groups.get(stageId) === "plants.item" ? [stageId] : [],
    );
    const flower = flowers.get(stageId);
    if (flower) {
      sources.push(tableSource(tables, flower, [0, 1, 2, 3]));
      for (const field of [1, 2]) {
        const target = tables.uint(flower, field);
        if (target !== null && scope.groups.get(target) === "plants.item") targets.add(target);
      }
    }
    if (targets.size > 1) throw new Error(`Conflicting plant stage targets ${id}:${stageId}`);
    stages.push({
      id: stageId,
      name: plantingItemName(context, stageId),
      image: null,
      plantId: [...targets][0] ?? null,
    });
    const link = links.get(stageId);
    if (!link) break;
    sources.push(tableSource(tables, link, [0, 2]));
    investigation.push({
      id: stageId,
      fields: [3, 4, 7].map((field) => ({ field, value: tables.uint(link, field) })),
      source: tableSource(tables, link, [0, 2, 3, 4, 7]),
    });
    stageId = tables.uint(link, 2);
    if (stageId === null) throw new Error(`Missing next plant stage ${id}:${tables.id(link)}`);
  }
  const growth: ObservedGrowth = { id, kind: "staged", stages, maturityDays: null };
  return { growth, sources, investigation };
}
