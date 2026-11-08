import { growthPlantIds } from "@loomix/schema/catalog";
import type { ObservedGrowth, ObservedSeed } from "./schema.ts";
import type { PlantingContext } from "./growth.ts";
import { plantingItemName, readCropGrowth, readStagedGrowth } from "./growth.ts";
import { plainText } from "../content/model.ts";
import { acquisition, trade } from "../collection/details/client.ts";
import {
  CollectionEvidenceBuilder,
  localizedSources,
  tableSource,
} from "../collection/evidence.ts";
import type { CollectionSource } from "../collection/evidence.ts";

export interface PlantExclusion {
  id: number;
  reason: "missing_use_configuration" | "random_planting_outside_scope" | "no_formal_plant";
  sources: CollectionSource[];
}

function seedObservation(context: PlantingContext, id: number) {
  const { tables } = context;
  const display = tables
    .byId(
      325,
      (row) => ({
        numbers: [15, 27].map((field) => tables.uint(row, field)),
        icons: [4, 5].map((field) => tables.string(row, field)),
        sources: tables.vector(row, 2),
      }),
      new Set([id]),
    )
    .get(id);
  const commerce = trade(context, id),
    origin = acquisition(context, id);
  const seed: ObservedSeed = {
    id,
    name: plantingItemName(context, id),
    description: plainText(tables.text(display, 27)),
    quality: display ? tables.uint(display, 15, 0) : null,
    image: null,
    growthId: id,
    trade: commerce.value,
    acquisition: origin.value,
  };
  return { seed, display, commerce, origin };
}

function recordEvidence(
  context: PlantingContext,
  builder: CollectionEvidenceBuilder,
  observation: ReturnType<typeof seedObservation>,
  growth: ObservedGrowth,
  sources: CollectionSource[],
) {
  const { tables, main } = context;
  const { seed, display, commerce, origin } = observation;
  const put = (
    owner: "seed" | "growth",
    field: string,
    value: unknown,
    proofSources: CollectionSource[],
    reason?: string,
  ) =>
    builder.put(
      owner,
      seed.id,
      field,
      value,
      proofSources,
      "客户端明确 ID 关系",
      "保留确认的配置值；不推断运行时规则",
      reason,
    );
  for (const field of ["id", "name"] as const)
    put(
      "seed",
      field,
      seed[field],
      localizedSources(tables, main.get(seed.id), field === "id" ? [0] : [0, 1]),
    );
  put("seed", "growthId", seed.growthId, sources);
  for (const field of ["description", "quality"] as const)
    put(
      "seed",
      field,
      seed[field],
      localizedSources(tables, display, [0, 15, 27]),
      "seed_display_configuration_missing",
    );
  put("seed", "trade", seed.trade, commerce.sources, "commerce_runtime_semantics_unconfirmed");
  put("seed", "acquisition", seed.acquisition, origin.sources, "source_configuration_missing");
  for (const [field, value] of Object.entries(growth))
    if (field !== "stages") put("growth", field, value, sources, "elapsed_days_not_confirmed");
  growth.stages.forEach((stage, index) => {
    for (const field of ["id", "name", "plantId"] as const)
      put(
        "growth",
        `stages.${index}.${field}`,
        stage[field],
        [...sources, ...localizedSources(tables, main.get(stage.id), [0, 1])],
        "no_confirmed_formal_plant_association",
      );
  });
}

export function readPlantings(context: PlantingContext) {
  const { tables, main, scope } = context;
  const crops = tables.byId(144),
    uses = tables.byId(334);
  const seeds: ObservedSeed[] = [],
    growths: ObservedGrowth[] = [];
  const exclusions: PlantExclusion[] = [];
  const investigation: ReturnType<typeof readStagedGrowth>["investigation"] = [];
  const evidence = new CollectionEvidenceBuilder();
  const candidates = [...main]
    .flatMap(([id, row]) =>
      id !== null && (crops.has(id) || tables.uint(row, 2) === 77) ? [id] : [],
    )
    .sort((a, b) => a - b);
  for (const id of candidates) {
    const crop = crops.get(id);
    let result: { growth: ObservedGrowth; sources: CollectionSource[] };
    if (crop) {
      if (!tables.vector(crop, 10)?.some((product) => scope.groups.get(product) === "plants.item"))
        continue;
      result = readCropGrowth(context, crop);
    } else {
      const use = uses.get(id);
      if (!use) {
        exclusions.push({
          id,
          reason: "missing_use_configuration",
          sources: [tableSource(tables, main.get(id)!, [0, 2])],
        });
        continue;
      }
      const effect = tables.string(use, 1);
      if (effect === "ITEM_USE_EFFECT_PLANT_RANDOM_SEEDLING") {
        exclusions.push({
          id,
          reason: "random_planting_outside_scope",
          sources: [tableSource(tables, use, [0, 1, 2])],
        });
        continue;
      }
      if (
        !effect ||
        !["ITEM_USE_EFFECT_PLANT_TREE_SEEDLING", "ITEM_USE_EFFECT_PLANT_FIXED_SEEDLING"].includes(
          effect,
        )
      )
        throw new Error(`Unknown seed effect ${id}:${effect}`);
      const staged = readStagedGrowth(context, id, use);
      investigation.push(...staged.investigation);
      result = staged;
      if (!growthPlantIds(result.growth).length) {
        exclusions.push({ id, reason: "no_formal_plant", sources: result.sources });
        continue;
      }
    }
    const observation = seedObservation(context, id);
    seeds.push(observation.seed);
    growths.push(result.growth);
    recordEvidence(context, evidence, observation, result.growth, result.sources);
  }
  return {
    seeds,
    growths,
    evidence: evidence.records,
    exclusions,
    investigation: [...new Map(investigation.map((record) => [record.id, record])).values()].sort(
      (a, b) => a.id - b.id,
    ),
  };
}
