import { parseContent } from "@loomix/content-schema";
import type { Content } from "@loomix/content-schema";
import { resourceUrl } from "@/infrastructure/resources";

export type MiscellanyData = Content["miscellaneous"];

export async function loadMiscellany(): Promise<MiscellanyData> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load miscellany: ${response.status}`);
  return parseContent(await response.json()).miscellaneous;
}
