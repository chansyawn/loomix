import type { ContentContext } from "../context.ts";
import type { SelectedImage, IconMatch } from "../../../types.ts";
import type { readPlantings } from "./read.ts";
import type { TableRow } from "../../../types.ts";

export interface PlantImageAudit {
  kind: "seed" | "stage";
  id: number;
  rowOffset: number | null;
  references: { field: number; reference: string | null; match: IconMatch | null }[];
  reason: "missing_display_row" | "image_not_configured" | "no_exact_indexed_image_match" | null;
}

export function plantIcons(
  context: Pick<ContentContext, "tables" | "resolveIcon">,
  id: number,
  row: TableRow | undefined,
) {
  const references = [5, 4].map((field) => {
    const reference = context.tables.string(row, field);
    return { field, reference, match: reference ? context.resolveIcon(reference) : null };
  });
  const matches = references.flatMap(({ reference, match: asset }): SelectedImage[] =>
    asset?.matched && asset.source && asset.container && asset.pathId && asset.resourceName
      ? [
          {
            id,
            group: "plants.item",
            reference: reference!,
            source: asset.source,
            container: asset.container,
            pathId: asset.pathId,
            resourceName: asset.resourceName,
            assetType: asset.assetType,
          },
        ]
      : [],
  );
  return { references, matches };
}

export function plantingImageCandidates(
  context: Pick<ContentContext, "tables" | "resolveIcon">,
  plants: Pick<ReturnType<typeof readPlantings>, "seeds" | "growths">,
) {
  const ids = new Set([
    ...plants.seeds.map((seed) => seed.id),
    ...plants.growths.flatMap((growth) => growth.stages.map((stage) => stage.id)),
  ]);
  const rows = context.tables.byId(
    325,
    (row) => [4, 5].map((field) => context.tables.string(row, field)),
    ids,
  );
  const audit: PlantImageAudit[] = [];
  const candidates = (items: Iterable<number>, kind: PlantImageAudit["kind"]): SelectedImage[] =>
    [...items].flatMap((id) => {
      const row = rows.get(id);
      const { references, matches } = plantIcons(context, id, row);
      audit.push({
        kind,
        id,
        rowOffset: row?.rowOffset ?? null,
        references,
        reason: matches.length
          ? null
          : !row
            ? "missing_display_row"
            : references.some((entry) => entry.reference)
              ? "no_exact_indexed_image_match"
              : "image_not_configured",
      });
      return matches;
    });
  const seeds = candidates(
    plants.seeds.map((seed) => seed.id),
    "seed",
  );
  const stages = candidates(
    [...new Set(plants.growths.flatMap((growth) => growth.stages.map((stage) => stage.id)))].sort(
      (a, b) => a - b,
    ),
    "stage",
  );
  return { seeds, stages, audit };
}
