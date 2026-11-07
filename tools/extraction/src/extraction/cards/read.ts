import type { Tables } from "../decode/tables.ts";
import type { CardSet, Item } from "@loomix/schema/catalog";
import type { TableRow } from "../types.ts";
import { plainText } from "../content/model.ts";
import { acquisition, trade } from "../collection/details/client.ts";
import { localizedSources, tableSource } from "../collection/evidence.ts";

export type CraftingCard = Extract<Item, { type: "craftingCard" }>;
export type CardImageReference = {
  owner: "card" | "set";
  id: number;
  field: "image" | keyof CardSet["artwork"];
  reference: string;
};

type CardProof = { owner: string; id: number; sources: ReturnType<typeof localizedSources> };
type MainItems = ReturnType<Tables["byId"]>;

function readNeighborCards(tables: Tables, main: MainItems) {
  const proofs: CardProof[] = [];
  const neighborsByGroup = new Map<number, Set<number>>();
  const sourcesByGroup = new Map<number, ReturnType<typeof localizedSources>>();
  for (const row of tables.rows(443)) {
    const groupId = tables.uint(row, 2);
    if (groupId === null) continue;
    const neighbors = neighborsByGroup.get(groupId) ?? new Set<number>();
    neighbors.add(tables.id(row));
    neighborsByGroup.set(groupId, neighbors);
    sourcesByGroup.set(groupId, [
      ...(sourcesByGroup.get(groupId) ?? []),
      tableSource(tables, row, [0, 2]),
    ]);
  }
  const neighborsByCard = new Map<number, Set<number>>();
  for (const row of tables.rows(444)) {
    const cardId = tables.uint(row, 2);
    const groupId = tables.id(row);
    const neighbors = neighborsByGroup.get(groupId);
    if (cardId === null || !neighbors || tables.uint(main.get(cardId), 2) !== 19) continue;
    const target = neighborsByCard.get(cardId) ?? new Set<number>();
    for (const id of neighbors) target.add(id);
    neighborsByCard.set(cardId, target);
    proofs.push({
      owner: "card.neighborIds",
      id: cardId,
      sources: [...(sourcesByGroup.get(groupId) ?? []), tableSource(tables, row, [0, 1, 2])],
    });
  }
  return { neighborsByCard, proofs };
}

function readRecipes(tables: Tables, main: MainItems) {
  const proofs: CardProof[] = [];
  const recipes = new Map<number, NonNullable<CraftingCard["recipe"]>>();
  const audit = [];
  for (const [id, row] of tables.byId(568)) {
    if (id === null) throw new Error("Missing crafting recipe ID");
    const productId = tables.uint(row, 1);
    if (!productId || !main.has(productId))
      throw new Error(`Missing crafting product ${id}:${productId}`);
    const materials = [12, 14, 16, 18].flatMap((field) => {
      const itemId = tables.uint(row, field);
      const quantity = tables.uint(row, field + 1);
      if (itemId === null && quantity === null) return [];
      if (!itemId || !quantity || !main.has(itemId))
        throw new Error(`Invalid crafting material ${id}.${field}`);
      return [{ itemId, quantity }];
    });
    if (new Set(materials.map((material) => material.itemId)).size !== materials.length)
      throw new Error(`Duplicate crafting material ${id}`);
    const recipe = {
      productId,
      quantity: tables.uint(row, 2),
      materials: materials.length ? materials : null,
      unresolvedReason: materials.length ? null : "material_slots_absent_semantics_unconfirmed",
    };
    const sources = [
      tableSource(tables, row, [0, 1, 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19]),
    ];
    const included = tables.uint(main.get(id), 2) === 19;
    audit.push({
      id,
      setId: tables.uint(row, 3),
      ...recipe,
      sources,
      disposition: included ? "included" : "orphan_card",
    });
    if (included) {
      recipes.set(id, recipe);
      proofs.push({ owner: "card.recipe", id, sources });
    }
  }
  return { recipes, audit, proofs };
}

export function readCraftingCards(context: Parameters<typeof acquisition>[0]) {
  const { tables } = context;
  const cards: CraftingCard[] = [];
  const imageReferences: CardImageReference[] = [];
  const proofs: CardProof[] = [];
  const references = new Set<number>();
  const main = tables.byId(318);
  const cardIds = new Set(
    [...main].flatMap(([id, row]) => (id !== null && tables.uint(row, 2) === 19 ? [id] : [])),
  );
  const displays = tables.byId(
    325,
    (row) => ({
      strings: [4, 5].map((field) => tables.string(row, field)),
      numbers: [15, 27].map((field) => tables.uint(row, field)),
      sources: tables.vector(row, 2),
    }),
    cardIds,
  );
  const recipeRows = tables.byId(568);
  const image = (
    owner: "card" | "set",
    id: number,
    field: CardImageReference["field"],
    row: TableRow | undefined,
    column: number,
  ) => {
    const reference = tables.string(row, column)?.replaceAll("\\", "/");
    if (reference) imageReferences.push({ owner, id, field, reference });
  };
  const sets: CardSet[] = tables.rows(180).map((row) => {
    const id = tables.id(row);
    const name = plainText(tables.text(row, 1));
    if (!name) throw new Error(`Missing card set name ${id}`);
    const columns = {
      bag: 4,
      background: 5,
      back: 6,
      icon: 7,
      lockedBackground: 8,
      unlockedBackground: 9,
      cover: 11,
    } as const;
    for (const [field, column] of Object.entries(columns))
      image("set", id, field as keyof CardSet["artwork"], row, column);
    proofs.push({
      owner: "set",
      id,
      sources: localizedSources(tables, row, [0, 1, 3, ...Object.values(columns)]),
    });
    return {
      id,
      name,
      acquisitionHint: plainText(tables.text(row, 3)),
      artwork: {
        cover: null,
        bag: null,
        back: null,
        background: null,
        icon: null,
        lockedBackground: null,
        unlockedBackground: null,
      },
    };
  });
  const npc = readNeighborCards(tables, main);
  const { recipes, audit, proofs: recipeProofs } = readRecipes(tables, main);
  const { neighborsByCard } = npc;
  proofs.push(...npc.proofs, ...recipeProofs);
  for (const [id, row] of main) {
    if (id === null || tables.uint(row, 2) !== 19) continue;
    const ui = displays.get(id);
    const name = plainText(tables.text(row, 1));
    if (!name) throw new Error(`Missing crafting card name ${id}`);
    const source = acquisition(context, id);
    const commerce = trade(context, id);
    for (const offer of commerce.value?.offers ?? []) {
      const row = tables.rows(659).find((row) => tables.id(row) === offer.id);
      if (!row) throw new Error(`Missing card offer ${offer.id}`);
      offer.buyPrice = tables.uint(row, 10);
      offer.currencyItemId = tables.uint(row, 11);
      offer.conditions = [17, 20, 23].flatMap((field) => {
        const kind = tables.string(row, field);
        return kind ? [{ field, kind, parameters: tables.string(row, field + 1) }] : [];
      });
      commerce.sources.push(tableSource(tables, row, [0, 1, 2, 10, 11, 17, 18, 20, 21, 23, 24]));
    }
    const recipeRow = recipeRows.get(id);
    image("card", id, "image", ui, tables.string(ui, 5) ? 5 : 4);
    for (const [field, column] of Object.entries({ bag: 7, back: 8, background: 9 } as const))
      image("card", id, field as keyof CraftingCard["artwork"], recipeRow, column);
    const recipe = recipes.get(id) ?? null;
    const quality = tables.uint(ui, 15);
    cards.push({
      id,
      type: "craftingCard",
      name,
      description: plainText(tables.text(ui, 27)),
      quality: quality !== null && quality <= 4 ? quality : null,
      image: null,
      subcategory: null,
      trade: commerce.value,
      acquisition: source.value,
      setId: tables.uint(recipeRow, 3),
      neighborIds: [...(neighborsByCard.get(id) ?? [])].sort((a, b) => a - b),
      artwork: { bag: null, back: null, background: null },
      recipe,
    });
    proofs.push({
      owner: "card",
      id,
      sources: [
        ...localizedSources(tables, row, [0, 1, 2]),
        ...localizedSources(tables, ui, [0, 4, 5, 15, 27]),
        ...source.sources,
        ...commerce.sources,
      ],
    });
    if (recipe) {
      references.add(recipe.productId);
      for (const material of recipe.materials ?? []) references.add(material.itemId);
    }
    for (const offer of commerce.value?.offers ?? [])
      if (offer.currencyItemId !== null) references.add(offer.currencyItemId);
  }
  return {
    cards: cards.sort((a, b) => a.id - b.id),
    sets: sets.sort((a, b) => a.id - b.id),
    references: [...references],
    imageReferences,
    proofs,
    audit,
  };
}
