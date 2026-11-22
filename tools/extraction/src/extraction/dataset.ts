import assert from "node:assert/strict";
import type { Dataset } from "@loomix/schema/dataset";
import { DatasetSchema, parseDataset } from "@loomix/schema/dataset";
import type { Vignettes } from "@loomix/schema/vignettes";
import { VignettesSchema } from "@loomix/schema/vignettes";
import { vignetteObjectIds, vignetteTargets } from "./source/vignettes/read.ts";

export type ExtractionDataset = Dataset & { vignettes?: Vignettes };
const snapshotSchema = DatasetSchema.extend({ vignettes: VignettesSchema });

export function publishedDataset({
  vignettes: _vignettes,
  ...dataset
}: ExtractionDataset): Dataset {
  return dataset;
}

export function parseExtractionDataset(input: unknown, version: 1 | 2): ExtractionDataset {
  if (version === 1) return parseDataset(input);
  const snapshot = snapshotSchema.parse(input);
  const dataset = parseDataset(publishedDataset(snapshot));
  const { templates, fallbackItems } = snapshot.vignettes;
  const items = new Map(dataset.catalog.items.map((item) => [item.id, item]));
  const fallback = new Set(fallbackItems.map(({ id }) => id));
  const tags = new Set(dataset.gameplayTags.tags.map(({ id }) => id));
  const neighbors = new Set(dataset.neighbors.neighbors.map(({ id }) => id));
  assert.equal(
    new Set(templates.map(({ id }) => id)).size,
    templates.length,
    "Duplicate vignette template",
  );
  assert.equal(fallback.size, fallbackItems.length, "Duplicate vignette fallback item");
  const requiredFallback = new Set<number>();
  for (const template of templates) {
    for (const id of vignetteObjectIds(template)) if (!items.has(id)) requiredFallback.add(id);
    for (const target of vignetteTargets(template))
      if ("allTagIds" in target)
        for (const id of target.allTagIds) assert.ok(tags.has(id), `Unknown vignette tag ${id}`);
    for (const id of template.creatureItemIds)
      assert.equal(items.get(id)?.kind, "creature", `Invalid vignette creature ${id}`);
    for (const id of template.neighborIds)
      assert.ok(neighbors.has(id), `Unknown vignette neighbor ${id}`);
  }
  assert.deepEqual(
    fallback,
    requiredFallback,
    "Vignette fallback items match missing catalog references",
  );
  return snapshot;
}
