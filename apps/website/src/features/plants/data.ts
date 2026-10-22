import { parseContent } from "@loomix/content-schema";
import type { Content } from "@loomix/content-schema";
import { resourceUrl } from "@/infrastructure/resources";

export type PlantsData = Content["plants"];

export async function loadPlants(): Promise<PlantsData> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load plants: ${response.status}`);
  return parseContent(await response.json()).plants;
}
