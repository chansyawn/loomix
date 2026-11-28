import type { createResourceReader } from "@/infrastructure/resources";
import { readNeighborDocument } from "../neighbors/data";
import { namedGiftPreferences } from "../neighbors/view";
import { readStarseaDocument } from "../starsea/data";
import { itemExplorationHints } from "../starsea/view";
import { readVignetteTemplates } from "../vignettes/data";
import { creatureVignettes } from "../vignettes/view";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";
import { vignetteGameplayUses } from "./gameplay-uses-model";

export function itemRelationReaders(
  read: ReturnType<typeof createResourceReader>,
  data: OmnidexCatalog,
  item: Extract<CatalogEntryRow["record"], { kind: string }>,
) {
  return {
    gifts: async () => namedGiftPreferences(await readNeighborDocument(read), item.id, data.image),
    islets: async () => itemExplorationHints(await readStarseaDocument(read), item.id, data.image),
    vignettes: async () => {
      const templates = await readVignetteTemplates(read);
      return {
        placements: vignetteGameplayUses(data, item, templates),
        related: item.kind === "creature" ? creatureVignettes(templates, item.id, data.image) : [],
      };
    },
  };
}

export type ItemRelationReaders = ReturnType<typeof itemRelationReaders>;
