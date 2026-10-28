import { z } from "zod";
import { CatalogSchema } from "../catalog/index.ts";
import { NeighborsSchema } from "../neighbors/index.ts";
import { WorldSchema } from "../world/index.ts";
import { ContextSchema, SourceSchema, assertValid } from "../common/identity.ts";
import { validateDataset } from "./validate.ts";

export { validateDataset } from "./validate.ts";
export const DatasetSchema = z.strictObject({
  context: ContextSchema,
  source: SourceSchema,
  catalog: CatalogSchema,
  neighbors: NeighborsSchema,
  world: WorldSchema,
});
export type Dataset = z.infer<typeof DatasetSchema>;
export function emptyDataset(context: Dataset["context"], source: Dataset["source"]): Dataset {
  return {
    context: { ...context },
    source: { ...source },
    catalog: {
      ...context,
      kind: "catalog",
      items: [],
      groups: [],
      appearances: [],
      seeds: [],
      growths: [],
      ingredientCategories: [],
      entries: [],
    },
    neighbors: {
      ...context,
      kind: "neighbors",
      neighbors: [],
      stars: [],
      stories: [],
      travelReactions: [],
      friendshipRules: [],
      eventTags: [],
      furnishingThemes: [],
      rewards: [],
      resources: [],
      additionalImages: [],
    },
    world: { ...context, kind: "world", islands: [], islandIconStyles: [], regions: [] },
  };
}
export const parseDataset = (input: unknown): Dataset => {
  const dataset = DatasetSchema.parse(input);
  assertValid(validateDataset(dataset));
  return dataset;
};
