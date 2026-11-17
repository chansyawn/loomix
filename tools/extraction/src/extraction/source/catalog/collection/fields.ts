import type { ContentContext } from "../context.ts";
import { plainText } from "../model.ts";
import type { CollectionEvidenceBuilder } from "./evidence.ts";
import { localizedSources } from "./evidence.ts";

export function readCreatureFields(
  context: ContentContext,
  id: number,
  proofs: CollectionEvidenceBuilder,
) {
  const { tables } = context;
  const row = context.scope.encyclopedia.get(id);
  const scientificName = plainText(tables.text(row, 16));
  proofs.put(
    "item",
    id,
    "attributes.scientificName",
    scientificName,
    localizedSources(tables, row, [16]),
    "93.0=item ID",
    "93.16 TextMap → scientific name; strip markup",
    "scientific_name_not_configured_or_text_missing",
  );
  return { scientificName };
}
