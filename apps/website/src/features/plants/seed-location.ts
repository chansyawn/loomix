import { collectionItemLocation, cropDetailLocation } from "../collection/item-route";
import type { PlantSeed } from "./model";

export function seedLocations(seed: Pick<PlantSeed, "cropSeriesId" | "plantIds">) {
  return seed.cropSeriesId !== null
    ? [cropDetailLocation(seed.cropSeriesId)]
    : seed.plantIds.map((id) =>
        collectionItemLocation({ id, catalogCategory: "plants", cropSeriesId: null }),
      );
}
