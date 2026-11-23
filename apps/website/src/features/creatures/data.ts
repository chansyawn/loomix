import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView } from "../omnidex-view.ts";

export type CreaturesData = OmnidexView["creatures"];

export async function loadCreatures(): Promise<CreaturesData> {
  return (await loadOmnidexView()).creatures;
}
