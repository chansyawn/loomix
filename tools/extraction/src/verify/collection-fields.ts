import assert from "node:assert/strict";
import type { CatalogV4, CraftingRecipe } from "@loomix/content-schema/v4";
import type { Tables } from "../extraction/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";
import { plainText } from "../extraction/content/model.ts";

export function verifyCollectionFields(catalog: CatalogV4, tables: Tables) {
  const main = tables.byId(318);
  const sources = tables.byId(618);
  const content = tables.byId(93);
  const recipeByDish = new Map(tables.rows(122).map((row) => [tables.uint(row, 4), row]));
  const difficulties = tables.byId(121);
  const records = new Map(catalog.items.map((item) => [item.id, item]));
  const seeds = tables
    .rows(144)
    .map((row) => ({
      id: tables.id(row),
      name: tables.text(main.get(tables.id(row)), 1),
      productIds: (tables.vector(row, 10) ?? [])
        .filter((id) => records.get(id)?.category === "plants" && records.get(id)?.kind === "item")
        .sort((a, b) => a - b),
    }))
    .filter((seed) => seed.productIds.length)
    .sort((a, b) => a.id - b.id);
  assert.deepEqual(
    catalog.cropSeeds.map(({ image: _image, ...seed }) => seed),
    seeds,
    "Independent crop seed index",
  );
  const productSeeds = new Map(seeds.flatMap((seed) => seed.productIds.map((id) => [id, seed.id])));
  const crafting = new Map<number, CraftingRecipe[]>();
  const audit = [];
  for (const row of tables.rows(568)) {
    const productId = tables.uint(row, 1);
    const product = productId === null ? undefined : records.get(productId);
    const included = product?.category === "furniture" && product.kind === "item";
    const materials: NonNullable<CraftingRecipe["materials"]> = [];
    for (let field = 12; field < 20; field += 2) {
      const itemId = tables.uint(row, field);
      const quantity = tables.uint(row, field + 1);
      if (itemId === null && quantity === null) continue;
      assert.ok(
        itemId !== null && quantity !== null && itemId > 0 && quantity > 0,
        "Crafting ID/quantity pair",
      );
      if (included) assert.equal(records.get(itemId)?.kind, "item");
      materials.push({ itemId, quantity });
    }
    const id = tables.id(row);
    audit.push({
      id,
      productId,
      materials: materials.length ? materials : null,
      unresolvedReason: materials.length ? null : "material_slots_absent_semantics_unconfirmed",
      source: {
        file: "prepared/ed.obb",
        table: 568,
        row: id,
        rowOffset: row.rowOffset,
        fields: [0, 1, 12, 13, 14, 15, 16, 17, 18, 19],
      },
      disposition: included ? "included" : "outside_scope",
    });
    if (included && productId !== null) {
      const entries = crafting.get(productId) ?? [];
      entries.push({
        id,
        materials: materials.length ? materials : null,
        unresolvedReason: materials.length ? null : "material_slots_absent_semantics_unconfirmed",
      });
      crafting.set(productId, entries);
    }
  }
  const requiredFields = new Map<string, unknown>();
  for (const record of catalog.items) {
    if (record.kind !== "item") continue;
    const expect = (field: string, actual: unknown, expected: unknown) => {
      assert.deepEqual(actual, expected, `${record.id}.${field}`);
      requiredFields.set(`item:${record.id}:${field}`, actual);
    };
    if (record.category === "furniture") {
      const recipes = crafting.get(record.id)?.sort((a, b) => a.id - b.id) ?? null;
      expect("craftingRecipes", record.craftingRecipes, recipes);
      continue;
    }
    if (record.category === "clothing") continue;
    const uiRows = tables.rows(325).filter((row) => tables.uint(row, 0) === record.id);
    const labelsFor = (row: TableRow) => {
      const labels = tables
        .vector(row, 2)
        ?.map((code) => plainText(tables.text(sources.get(code), 1)));
      return labels?.length && labels.every(Boolean) ? [...new Set(labels)].join("，") : null;
    };
    const sourceText = uiRows.length ? labelsFor(uiRows[0]!) : null;
    for (const row of uiRows)
      assert.equal(labelsFor(row), sourceText, "Duplicate source semantics");
    expect("attributes.sources", record.attributes.sources, sourceText);
    if (record.category === "plants")
      expect("seedId", record.seedId, productSeeds.get(record.id) ?? null);
    if (record.category === "creatures") {
      const row = content.get(record.id);
      expect(
        "attributes.scientificName",
        record.attributes.scientificName,
        plainText(tables.text(row, 16)),
      );
      const tasks = ([7, 8, 9] as const).flatMap((field, index) => {
        const text = plainText(tables.text(row, field));
        return text
          ? [{ kind: ["collectionCount", "collectionSize", "cooking"][index], text }]
          : [];
      });
      const completionConditions = [13, 14, 15].flatMap((field) => {
        const text = plainText(tables.text(row, field));
        if (!text) return [];
        const match = /^完成任意([1-9]\d*)个课题$/.exec(text);
        assert.ok(match);
        return [{ requiredTaskCount: Number(match[1]), text }];
      });
      expect(
        "research",
        record.research,
        tasks.length || completionConditions.length ? { tasks, completionConditions } : null,
      );
    }
    if (record.category === "dishes") {
      const recipe = recipeByDish.get(record.id);
      const tastes = tables.string(recipe, 15);
      expect(
        "attributes.tastes",
        record.attributes.tastes,
        tastes ? [...new Set(tastes.split("|"))] : null,
      );
      const row = difficulties.get(tables.uint(recipe, 2));
      const rawExpression = tables.string(row, 2);
      let requirement: unknown = null;
      if (rawExpression) {
        const input: unknown = JSON.parse(rawExpression);
        assert.ok(typeof input === "object" && input !== null && "childList" in input);
        const list = input.childList;
        assert.ok(
          typeof list === "object" &&
            list !== null &&
            "nodeList" in list &&
            Array.isArray(list.nodeList) &&
            list.nodeList.length === 1,
        );
        const node: unknown = list.nodeList[0];
        assert.ok(typeof node === "object" && node !== null && "leaf" in node);
        const leaf = node.leaf;
        assert.ok(typeof leaf === "object" && leaf !== null);
        const entries = Object.entries(leaf);
        assert.equal(entries.length, 1);
        const [kind, parameters] = entries[0]!;
        assert.ok(kind === "chefLevelGreaterOrEqual" || kind === "learnCookRecipeInCategory");
        assert.ok(typeof parameters === "object" && parameters !== null);
        requirement = { rawExpression, condition: { kind, ...parameters }, unresolvedReason: null };
      }
      expect("difficultyRequirement", record.difficultyRequirement, requirement);
    }
  }
  for (const seed of catalog.cropSeeds) {
    requiredFields.set(`seed:${seed.id}:name`, seed.name);
    requiredFields.set(`seed:${seed.id}:productIds`, seed.productIds);
  }
  return { requiredFields, craftingAudit: audit };
}
