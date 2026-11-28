import type { createResourceReader } from "@/infrastructure/resources";
import { readNeighborDocument } from "../neighbors/data";
import { itemGiftPreferences } from "../neighbors/view";
import { readStarseaDocument } from "../starsea/data";
import { itemExplorationHints } from "../starsea/view";
import { readVignetteTemplates } from "../vignettes/data";
import { creatureVignettes } from "../vignettes/view";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";
import { vignetteGameplayUses } from "./gameplay-uses-model";
import { readHairDyeingData } from "../clothing/hair-dyeing";
import { flowerDyeingUses } from "../clothing/flower-dyeing";

export function itemRelationReaders(
  read: ReturnType<typeof createResourceReader>,
  data: OmnidexCatalog,
  item: Extract<CatalogEntryRow["record"], { kind: string }>,
) {
  return {
    flowerDyeing:
      item.kind === "plant" && item.category === "花"
        ? async () =>
            flowerDyeingUses(await readHairDyeingData(read), item.id, data.view.ingredientItemsById)
        : undefined,
    gifts: async () =>
      itemGiftPreferences(await readNeighborDocument(read), item, data.tagIndex, data.image),
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
