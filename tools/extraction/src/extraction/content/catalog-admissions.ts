import type { ContentContext } from "./context.ts";
import { readPlantings } from "../plants/read.ts";

export function catalogAdmissionIds(context: ContentContext): Set<number> {
  const plantings = readPlantings(context);
  return new Set([...context.scope.ids, ...plantings.seeds.map((seed) => seed.id)]);
}
