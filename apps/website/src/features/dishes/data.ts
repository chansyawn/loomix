import { parseContent } from "@loomix/content-schema";
import type { Content } from "@loomix/content-schema";
import { resourceUrl } from "@/infrastructure/resources";

export type DishesData = Content["dishes"];

export async function loadDishes(): Promise<DishesData> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load dishes: ${response.status}`);
  return parseContent(await response.json()).dishes;
}
