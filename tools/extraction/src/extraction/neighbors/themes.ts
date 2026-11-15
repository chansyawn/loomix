import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborExclusion, NeighborRecord } from "./types.ts";
import { excludeField } from "./observations.ts";

export function readDesign(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): NeighborRecord["design"] {
  const row = tables.byId(472).get(id);
  if (row)
    for (const [field, path] of [
      [1, "furnitureSetId"],
      [2, "craftingCollectionId"],
    ] as const)
      excludeField(
        records,
        exclusions,
        id,
        `design.${path}`,
        row,
        [0, field],
        tables.uint(row, field) === null
          ? "theme_not_configured"
          : "theme_target_namespace_unconfirmed",
      );
  return { furnitureSetId: null, craftingCollectionId: null };
}
