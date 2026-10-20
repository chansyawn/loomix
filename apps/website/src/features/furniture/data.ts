import { parseContent } from "@petit-orbit/content-schema";
import type { Content } from "@petit-orbit/content-schema";
import { resourceUrl } from "@/infrastructure/resources";

export type FurnitureData = Content["furniture"];

export async function loadFurniture(): Promise<FurnitureData> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load furniture: ${response.status}`);
  return parseContent(await response.json()).furniture;
}
