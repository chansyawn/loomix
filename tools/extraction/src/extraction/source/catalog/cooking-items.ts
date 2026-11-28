import type { ItemOf } from "@loomix/schema/catalog";
import { profile } from "../../../profile.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { SourceProof, WithImageUses } from "../../model.ts";
import type { imageCollector } from "../images.ts";
import { cardIcon } from "./card-display.ts";
import { localizedSources, tableSource, type CollectionSource } from "./collection/evidence.ts";
import { type ContentContext, uiSignature } from "./context.ts";
import { plainText } from "./model.ts";

function evidenceSources(rows: CollectionSource[]): EvidenceSource[] {
  return rows.map(({ file, table, rowOffset, fields }) => ({
    kind: "table",
    file,
    table,
    rowOffset,
    fields,
  }));
}

export function readCookingItems(
  context: ContentContext,
  dishIds: ReadonlySet<number>,
  images: ReturnType<typeof imageCollector>,
  tagIds: (id: number) => number[],
) {
  const { tables } = context;
  const recipes = tables.byId(profile.roots.recipes);
  const admitted = [];
  const exclusions = [];
  for (const main of context.main.values()) {
    if (tables.uint(main, 2) !== profile.cookingRecipeItems.type) continue;
    const id = tables.id(main);
    const recipe = recipes.get(id);
    const productId = tables.uint(recipe, 4);
    const sources = [tableSource(tables, main, [0, 2])];
    if (recipe) sources.push(tableSource(tables, recipe, [0, 4]));
    if (productId === null || !dishIds.has(productId)) {
      exclusions.push({ id, productId, reason: recipe ? "outside_dishes" : "no_recipe", sources });
      continue;
    }
    admitted.push({ id, productId, main, sources });
  }
  const display = tables.byId(
    profile.roots.ui,
    uiSignature(tables),
    new Set(admitted.map(({ id }) => id)),
  );
  const background = profile.cookingRecipeItems.background;
  const proofs: SourceProof[] = [];
  const items = admitted.map(
    ({ id, main, productId, sources }): WithImageUses<ItemOf<"cookingRecipeItem">> => {
      const ui = display.get(id);
      const name = plainText(tables.text(main, 1));
      if (!name) throw new Error(`Missing cooking recipe item name ${id}`);
      const description = plainText(tables.text(ui, 27));
      const quality = ui ? tables.uint(ui, 15, 0) : null;
      const relation = evidenceSources(sources);
      const uiSource = (fields: number[]): EvidenceSource[] =>
        ui
          ? evidenceSources([tableSource(tables, ui, fields)])
          : [{ kind: "tableScan", file: "prepared/ed.obb", table: profile.roots.ui }];
      for (const [field, value, sources] of [
        ["kind", "cookingRecipeItem", relation],
        ["productId", productId, relation],
        ["name", name, evidenceSources(localizedSources(tables, main, [1]))],
        ["description", description, evidenceSources(localizedSources(tables, ui, [27]))],
        ["quality", quality, uiSource([0, 15])],
      ] as const) {
        proofs.push({
          owner: "item",
          id,
          field,
          sources,
          status: value === null ? "unresolved" : "confirmed",
          ruleId: "client.catalog.cooking_items",
          reasonCode: value === null ? "configuration_missing" : null,
        });
      }
      return {
        kind: "cookingRecipeItem",
        id,
        name,
        description,
        quality,
        productId,
        tagIds: tagIds(id),
        image: { use: cardIcon(context, images, id, ui, uiSource([0, 5, 4])) },
        front: {
          background: {
            use: images.configured(
              { kind: "item", id, field: "front.background" },
              background.reference,
              "card-background",
              [{ kind: "asset", file: background.source, pathId: background.pathId }],
              true,
            ),
          },
        },
      };
    },
  );
  return { items, proofs, exclusions };
}
