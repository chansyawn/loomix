import { parseContent } from "@loomix/content-schema";
import type { Content } from "@loomix/content-schema";
import { resourceUrl } from "@/infrastructure/resources";

export type CreaturesData = Content["creatures"];

export async function loadCreatures(): Promise<CreaturesData> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load creatures: ${response.status}`);
  return parseContent(await response.json()).creatures;
}
