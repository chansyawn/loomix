import type { ContentContext } from "./context.ts";
import type { NeighborOutfit } from "../neighbors/types.ts";
import type { ImageUse, SourceProof, WithImageUses } from "../../model.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { ItemOf } from "@loomix/schema/catalog";
import { readCatalogMetadata } from "./metadata/read.ts";
import { acquisition } from "./collection/details/client.ts";
import { localizedSources } from "./collection/evidence.ts";

export function readOutfits(
  context: ContentContext,
  outfits: readonly NeighborOutfit[],
  sourcesById: ReadonlyMap<number, EvidenceSource[]>,
  image: (reference: string, id: number) => ImageUse | null,
) {
  const { tables } = context;
  const metadata = readCatalogMetadata(tables, context.gameplayTags.index);
  const proofs: SourceProof[] = [];
  const items = outfits.map((outfit): WithImageUses<ItemOf<"neighborOutfit">> => {
    const rows = tables.rows(325).filter((row) => tables.id(row) === outfit.id);
    const qualities = rows.map((row) => tables.uint(row, 15, 0));
    if (new Set(qualities).size > 1)
      throw new Error(`Conflicting neighbor clothing qualities ${outfit.id}`);
    const prices = new Set(outfit.offers.map((offer) => offer.configuredPrice));
    if (prices.size > 1) throw new Error(`Conflicting neighbor clothing prices ${outfit.id}`);
    const use = image(outfit.imagePath, outfit.id);
    if (!use) throw new Error(`Missing neighbor clothing image ${outfit.id}`);
    const origin = acquisition(context, outfit.id);
    const tags = metadata.record(outfit.id);
    const value: WithImageUses<ItemOf<"neighborOutfit">> = {
      id: outfit.id,
      kind: "neighborOutfit",
      name: outfit.nameZh,
      description: outfit.descriptionZh,
      quality: qualities[0] ?? 0,
      image: use,
      acquisition: origin.value?.map(({ sourceId, label }) => ({ sourceId, label })) ?? null,
      tagIds: tags.value.tagIds,
      category: outfit.slotNameZh,
      neighborId: outfit.neighborId,
      playerItemId:
        outfit.playerItemId !== null && context.main.has(outfit.playerItemId)
          ? outfit.playerItemId
          : null,
      bodyTypes: outfit.bodyTypes,
      price: [...prices][0] ?? null,
    };
    const sources = sourcesById.get(outfit.id) ?? [];
    for (const field of [
      "name",
      "description",
      "kind",
      "neighborId",
      "category",
      "bodyTypes",
      "playerItemId",
      "price",
    ] as const)
      proofs.push({
        owner: "item",
        id: outfit.id,
        field,
        status: value[field] === null ? "absent" : "confirmed",
        sources,
        ruleId: "client.neighborOutfit.explicit_configuration",
        reasonCode: value[field] === null ? "not_configured" : null,
      });
    proofs.push({
      owner: "item",
      id: outfit.id,
      field: "quality",
      status: "confirmed",
      sources: rows.length
        ? rows.flatMap((row) =>
            localizedSources(tables, row, [0, 15]).map(({ file, table, rowOffset, fields }) => ({
              kind: "table" as const,
              file,
              table,
              rowOffset,
              fields,
            })),
          )
        : sources,
      ruleId: "client.neighborOutfit.quality",
      reasonCode: null,
    });
    proofs.push({
      owner: "item",
      id: outfit.id,
      field: "acquisition",
      status: origin.value === null ? "unresolved" : "confirmed",
      sources: origin.sources.map(({ file, table, rowOffset, fields }) => ({
        kind: "table",
        file,
        table,
        rowOffset,
        fields,
      })),
      ruleId: "client.catalog.acquisition",
      reasonCode: origin.value === null ? origin.reason : null,
    });
    proofs.push(
      ...tags.proofs.map(({ fieldPath, ...proof }) => ({
        owner: "item" as const,
        id: outfit.id,
        field: fieldPath,
        ...proof,
      })),
    );
    return value;
  });
  return { items, proofs };
}
