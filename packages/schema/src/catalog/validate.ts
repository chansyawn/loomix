import { RECORD_TAG_FIELD_NAMES, mergeRecordTagIds } from "./classification.ts";
import { recordTarget } from "./location.ts";
import { validatePlantings } from "./growth.ts";
import { isGroupRecord, resolveItem } from "./records.ts";
import type { Catalog } from "./index.ts";
import type { IngredientExpression } from "./recipes.ts";
import type { ValidationIssue } from "../common/identity.ts";

export function validateCatalog(catalog: Catalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issue = (path: (string | number)[], message: string) =>
    issues.push({ code: "invalid_reference", path: ["catalog", ...path], message });
  const unique = <T>(
    values: readonly T[],
    key: (value: T) => string | number,
    path: (string | number)[],
  ) => {
    const seen = new Set<string | number>();
    values.forEach((value, index) => {
      const id = key(value);
      if (seen.has(id)) issue([...path, index], `Duplicate identity ${id}`);
      seen.add(id);
    });
  };
  for (const name of [
    "records",
    "references",
    "craftingRecipes",
    "growths",
    "clientTypes",
  ] as const)
    unique<{ id: number }>(catalog[name], (value) => value.id, [name]);
  const clientTypes = new Map(catalog.clientTypes.map((type) => [type.id, type]));
  for (const [index, type] of catalog.clientTypes.entries())
    unique(type.tagIds, (id) => id, ["clientTypes", index, "tagIds"]);
  const records = new Map(catalog.records.map((record) => [record.id, record]));
  const categories = new Map(
    catalog.ingredientCategories.map((category) => [category.tagId, category]),
  );
  const checkItems = (ids: readonly number[], path: (string | number)[], type?: string) => {
    unique(ids, (value) => value, path);
    ids.forEach((id, index) => {
      const record = records.get(id);
      if (type ? record?.kind !== type : !resolveItem(catalog, id))
        issue([...path, index], `Unknown ${type ?? "item"} ${id}`);
    });
  };
  for (const [index, reference] of catalog.references.entries())
    if (records.has(reference.id))
      issue(["references", index], "Reference duplicates a formal record");
  const expression = (value: IngredientExpression, path: (string | number)[]) => {
    if (value.kind === "tag") {
      if (!categories.has(value.tagId)) issue(path, `Unknown ingredient category ${value.tagId}`);
    } else value.terms.forEach((term, index) => expression(term, [...path, "terms", index]));
  };
  catalog.records.forEach((record, index) => {
    const path = ["records", index];
    try {
      recordTarget(catalog, record.id);
    } catch (error) {
      issue(path, error instanceof Error ? error.message : "Invalid record destination");
    }
    unique(record.admissionReasons, (reason) => reason, [...path, "admissionReasons"]);
    unique(record.tagIds, (id) => id, [...path, "tagIds"]);
    const type = clientTypes.get(record.client.type);
    if (!type) issue([...path, "client", "type"], `Unknown client type ${record.client.type}`);
    else {
      const expected = mergeRecordTagIds(record.tagFields, type.tagIds);
      if (
        expected.length !== record.tagIds.length ||
        expected.some((id, index) => record.tagIds[index] !== id)
      )
        issue([...path, "tagIds"], "Must equal the ordered tag source union");
    }
    for (const field of RECORD_TAG_FIELD_NAMES)
      unique(record.tagFields[field], (id) => id, [...path, "tagFields", field]);
    if (isGroupRecord(record)) {
      if (record.memberIds !== null) {
        const type = {
          "furniture.set": "furniture",
          "clothing.set": "clothing",
          "creatures.series": "creature",
          "plants.series": "plant",
          "dishes.series": "dish",
        }[record.kind];
        checkItems(record.memberIds, [...path, "memberIds"], type);
      }
      return;
    }
    if ("trade" in record)
      for (const offer of record.trade?.offers ?? [])
        if (offer.currencyItemId !== null) checkItems([offer.currencyItemId], [...path, "trade"]);
    if (record.kind === "neighborClothing" && record.playerItemId !== null) {
      const counterpart = records.get(record.playerItemId);
      if (counterpart && counterpart.kind !== "clothing")
        issue([...path, "playerItemId"], "Counterpart must be player clothing");
      if (
        !counterpart &&
        !catalog.references.some((reference) => reference.id === record.playerItemId)
      )
        issue([...path, "playerItemId"], `Unknown player clothing ${record.playerItemId}`);
    }
    if (record.kind === "plant") {
      checkItems(record.drops?.map((drop) => drop.itemId) ?? [], [...path, "drops"]);
      for (const drop of record.drops ?? [])
        if (
          drop.quantityMin !== null &&
          drop.quantityMax !== null &&
          drop.quantityMin > drop.quantityMax
        )
          issue(path, "Invalid drop quantity range");
      for (const recipe of record.hybridRecipes ?? [])
        checkItems(
          [...recipe.parents.map((parent) => parent.itemId), recipe.productId],
          [...path, "hybridRecipes"],
          "plant",
        );
    }
    if (
      record.kind === "creature" &&
      record.size?.min != null &&
      record.size.max !== null &&
      record.size.min > record.size.max
    )
      issue(path, "Invalid size range");
    if (record.kind === "dish") {
      unique(record.recipe?.slots ?? [], (slot) => slot.field, [...path, "recipe", "slots"]);
      for (const slot of record.recipe?.slots ?? []) {
        if ((slot.expression === null) !== (slot.itemIds === null))
          issue(path, "Expression and candidates must have the same resolution state");
        if (slot.expression) expression(slot.expression, path);
        if (slot.itemIds) checkItems(slot.itemIds, path);
      }
      if (record.tastes) unique(record.tastes, (taste) => taste, [...path, "tastes"]);
    }
  });
  for (const [index, category] of catalog.ingredientCategories.entries()) {
    checkItems(category.itemIds, ["ingredientCategories", index, "itemIds"]);
  }
  unique(catalog.ingredientCategories, (category) => category.tagId, ["ingredientCategories"]);
  for (const [index, recipe] of catalog.craftingRecipes.entries()) {
    if (!records.has(recipe.productId))
      issue(["craftingRecipes", index], "Crafting product is outside formal records");
    checkItems(recipe.materials?.map((material) => material.itemId) ?? [], [
      "craftingRecipes",
      index,
      "materials",
    ]);
  }
  issues.push(
    ...validatePlantings(
      catalog.records.filter((record) => record.kind === "seed"),
      catalog.growths,
      new Set(
        catalog.records.filter((record) => record.kind === "plant").map((record) => record.id),
      ),
    ).map((entry) => ({ ...entry, path: ["catalog", ...entry.path] })),
  );
  return issues;
}
