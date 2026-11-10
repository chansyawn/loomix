import { cropDetailLocation } from "../collection/item-route";
import type { PlantSeed } from "./model";

export function seedLocation(seed: Pick<PlantSeed, "id" | "cropSeriesId" | "plantIds">) {
  if (seed.cropSeriesId !== null) return cropDetailLocation(seed.cropSeriesId, seed.id);
  if (seed.plantIds.length !== 1) throw new Error(`Ambiguous seed destination ${seed.id}`);
  return {
    to: "/collections/records/$id" as const,
    params: { id: String(seed.plantIds[0]) },
    search: { focus: seed.id },
  };
}
