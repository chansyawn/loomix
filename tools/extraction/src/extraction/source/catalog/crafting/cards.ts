import type { Acquisition, CreationCardSet, ItemOf, Quality } from "@loomix/schema/catalog";
import type { TableRow } from "../../../types.ts";
import type { SourceProof, WithImageUses } from "../../../model.ts";
import type { EvidenceSource } from "../../../evidence/domain-schema.ts";
import type { imageCollector, LocatedImage } from "../../images.ts";
import type { ContentContext } from "../context.ts";
import { uiSignature } from "../context.ts";
import { localizedSources } from "../collection/evidence.ts";
import { plainText } from "../model.ts";
import type { readCraftingRecipes } from "./read.ts";

export function isPlaceholderIcon(reference: string): boolean {
  return /^uisprite\/load\/item\/cloud(?:\.png)?$/i.test(reference.trim().replaceAll("\\", "/"));
}

export function readCreationCards(
  context: ContentContext,
  recipes: ReturnType<typeof readCraftingRecipes>["recipes"],
  images: ReturnType<typeof imageCollector>,
  origin: (id: number) => Acquisition[] | null,
  tagIds: (id: number) => number[],
) {
  const { tables, main } = context;
  const ui = tables.byId(325, uiSignature(tables), new Set(recipes.map(({ id }) => id)));
  const setRows = tables.byId(180);
  const sets = new Map<number, WithImageUses<CreationCardSet>>();
  const proofs: SourceProof[] = [];
  const source = (row: TableRow | undefined, ...fields: number[]): EvidenceSource[] =>
    localizedSources(tables, row, fields).map(({ file, table, rowOffset, fields }) => ({
      kind: "table",
      file,
      table,
      rowOffset,
      fields,
    }));
  const tableFields = (row: TableRow | undefined, ...fields: number[]) =>
    row
      ? [
          {
            kind: "table" as const,
            file: "prepared/ed.obb",
            table: row.root,
            rowOffset: row.rowOffset,
            fields,
          },
        ]
      : [];
  const proof = (
    owner: SourceProof["owner"],
    id: number,
    field: string,
    value: unknown,
    sources: EvidenceSource[],
  ) =>
    proofs.push({
      owner,
      id,
      field,
      status: value === null ? "unresolved" : "confirmed",
      sources,
      ruleId: `client.catalog.creation_cards.${field}`,
      reasonCode: value === null ? "configuration_missing" : null,
    });

  for (const { cardSetId } of recipes) {
    if (cardSetId === null || sets.has(cardSetId)) continue;
    const row = setRows.get(cardSetId)!;
    const name = plainText(tables.text(row, 1));
    if (!name) throw new Error(`Missing creation card set name ${cardSetId}`);
    const acquisitionHint = plainText(tables.text(row, 3));
    const use = images.configured(
      { kind: "creationCardSet", id: cardSetId, field: "image" },
      tables.string(row, 11),
      "illustration",
      tableFields(row, 11),
    );
    proof("creationCardSet", cardSetId, "name", name, source(row, 1));
    proof("creationCardSet", cardSetId, "acquisitionHint", acquisitionHint, source(row, 3));
    sets.set(cardSetId, { id: cardSetId, name, acquisitionHint, image: { use } });
  }

  const cards = recipes.map(
    ({ id, cardSetId, row, productId, materials }): WithImageUses<ItemOf<"creationCard">> => {
      const mainRow = main.get(id)!;
      const uiRow = ui.get(id);
      const name = plainText(tables.text(mainRow, 1));
      if (!name) throw new Error(`Missing creation card name ${id}`);
      const description = plainText(tables.text(uiRow, 27));
      const quality = uiRow ? tables.uint(uiRow, 15, 0) : null;
      if (quality !== null && !context.vocabulary.qualityLabels.has(quality))
        throw new Error(`Unknown creation card quality ${id}:${quality}`);
      const references = [5, 4].flatMap((field) => {
        const reference = tables.string(uiRow, field);
        return reference && !isPlaceholderIcon(reference) ? [reference] : [];
      });
      const candidates = references.flatMap((reference): LocatedImage[] => {
        const match = context.resolveIcon(reference);
        return match?.matched &&
          match.source &&
          match.pathId &&
          match.container &&
          match.resourceName
          ? [
              {
                ...match,
                reference,
                source: match.source,
                pathId: match.pathId,
                container: match.container,
                resourceName: match.resourceName,
              },
            ]
          : [];
      });
      const icon = images.need(
        { kind: "item", id, field: "image" },
        candidates,
        "icon",
        tableFields(uiRow, 4, 5),
        "image_not_configured_or_matched",
        false,
        references,
      );
      const background = images.configured(
        { kind: "item", id, field: "front.background" },
        tables.string(row, 9),
        "card-background",
        tableFields(row, 9),
        true,
      );
      const recipe = { productId, materials };
      proof("item", id, "kind", "creationCard", tableFields(mainRow, 2));
      proof("item", id, "name", name, source(mainRow, 1));
      proof("item", id, "description", description, source(uiRow, 27));
      proof("item", id, "quality", quality, tableFields(uiRow, 15));
      proof("item", id, "cardSetId", cardSetId, tableFields(row, 3));
      proof("item", id, "recipe", recipe, tableFields(row, 1, 2, 12, 13, 14, 15, 16, 17, 18, 19));
      return {
        id,
        kind: "creationCard",
        name,
        description,
        quality: quality as Quality | null,
        acquisition: origin(id),
        tagIds: tagIds(id),
        image: { use: icon },
        front: { background: { use: background } },
        cardSetId,
        recipe,
      };
    },
  );
  return { cards, sets: [...sets.values()].sort((a, b) => a.id - b.id), proofs };
}
