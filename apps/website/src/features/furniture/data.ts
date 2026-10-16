import { parseContent } from "@petit-orbit/content-schema";
import type { Content } from "@petit-orbit/content-schema";

export type FurnitureData = Content["furniture"];

export async function loadFurniture(): Promise<FurnitureData> {
  const response = await fetch("/resources/content.json");
  if (!response.ok) throw new Error(`Unable to load furniture: ${response.status}`);
  return parseContent(await response.json()).furniture;
}
