import { z } from "zod";
import { GameplayTagsSchema } from "../gameplay-tags/index.ts";
import { CatalogSchema } from "../catalog/index.ts";
import { NeighborsSchema } from "../neighbors/index.ts";
import { StarseaSchema } from "../starsea/index.ts";
import { VignettesSchema } from "../vignettes/index.ts";
import { ContextSchema, SourceSchema, assertValid } from "../common/identity.ts";
import { validateDataset } from "./validate.ts";

export { validateDataset } from "./validate.ts";
export const DatasetSchema = z.strictObject({
  context: ContextSchema,
  source: SourceSchema,
  gameplayTags: GameplayTagsSchema,
  catalog: CatalogSchema,
  neighbors: NeighborsSchema,
  starsea: StarseaSchema,
  vignettes: VignettesSchema,
});
export type Dataset = z.infer<typeof DatasetSchema>;
export function emptyDataset(context: Dataset["context"], source: Dataset["source"]): Dataset {
  return {
    context: { ...context },
    source: { ...source },
    gameplayTags: { tags: [] },
    catalog: { items: [], collections: [], inspoBoxes: [] },
    neighbors: { neighbors: [] },
    starsea: { regions: [], islets: [], iconStyles: [] },
    vignettes: { templates: [], fallbackItems: [] },
  };
}
export const parseDataset = (input: unknown): Dataset => {
  const dataset = DatasetSchema.parse(input);
  assertValid(validateDataset(dataset));
  return dataset;
};
