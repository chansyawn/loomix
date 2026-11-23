import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView } from "../omnidex-view.ts";

export type ClothingData = OmnidexView["clothing"];
export type ClothingRow = ClothingData[keyof ClothingData][number];

export async function loadClothing(): Promise<ClothingData> {
  return (await loadOmnidexView()).clothing;
}
