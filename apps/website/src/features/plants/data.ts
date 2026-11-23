import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView } from "../omnidex-view.ts";

export type PlantsData = OmnidexView["plants"];

export async function loadPlants(): Promise<PlantsData> {
  return (await loadOmnidexView()).plants;
}
