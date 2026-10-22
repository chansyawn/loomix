import { parseContent } from "@loomix/content-schema";
import type { Content } from "@loomix/content-schema";
import { resourceUrl } from "@/infrastructure/resources";

export type ClothingData = Content["clothing"];

export async function loadClothing(): Promise<ClothingData> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load clothing: ${response.status}`);
  return parseContent(await response.json()).clothing;
}
