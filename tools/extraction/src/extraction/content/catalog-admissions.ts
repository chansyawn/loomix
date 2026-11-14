import type { ContentContext } from "./context.ts";
import { readPlantings } from "../plants/read.ts";

export function catalogAdmissionIds(
  context: ContentContext,
  neighborClothingIds: readonly number[] = [],
): Set<number> {
  const plantings = readPlantings(context);
  return new Set([
    ...context.scope.ids,
    ...plantings.seeds.map((seed) => seed.id),
    ...neighborClothingIds,
  ]);
}
