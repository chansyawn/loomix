import { loadOmnidexView } from "../omnidex-loader.ts";
import type { OmnidexView } from "../omnidex-view.ts";

export type MiscellaneousData = OmnidexView["miscellaneous"];

export async function loadMiscellaneous(): Promise<MiscellaneousData> {
  return (await loadOmnidexView()).miscellaneous;
}
