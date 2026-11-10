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
    "gameplayTags",
    "craftingRecipes",
    "growths",
    "ingredientCategories",
  ] as const)
    unique<{ id: number }>(catalog[name], (value) => value.id, [name]);
  const records = new Map(catalog.records.map((record) => [record.id, record]));
  const tags = new Map(catalog.gameplayTags.map((tag) => [tag.id, tag]));
  const categories = new Map(
    catalog.ingredientCategories.map((category) => [category.id, category]),
  );
  const checkItems = (ids: readonly number[], path: (string | number)[], type?: string) => {
    unique(ids, (value) => value, path);
    ids.forEach((id, index) => {
      const record = records.get(id);
      if (type ? record?.type !== type : !resolveItem(catalog, id))
        issue([...path, index], `Unknown ${type ?? "item"} ${id}`);
    });
  };
  for (const [index, reference] of catalog.references.entries())
    if (records.has(reference.id))
      issue(["references", index], "Reference duplicates a formal record");
  for (const [index, tag] of catalog.gameplayTags.entries()) {
    const seen = new Set<number>();
    let current: typeof tag | undefined = tag;
    while (current) {
      if (seen.has(current.id)) {
        issue(["gameplayTags", index], "Tag parent cycle");
        break;
      }
      seen.add(current.id);
      if (current.parentId !== null && !tags.has(current.parentId))
        issue(["gameplayTags", index], "Unknown parent tag");
      current = current.parentId === null ? undefined : tags.get(current.parentId);
    }
  }
  const expression = (value: IngredientExpression, path: (string | number)[]) => {
    if (value.kind === "category") {
      if (!categories.has(value.categoryId))
        issue(path, `Unknown ingredient category ${value.categoryId}`);
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
    unique(record.gameplayTagGroups, (group) => group.field, [...path, "gameplayTagGroups"]);
    for (const group of record.gameplayTagGroups) {
      unique(group.tagIds, (id) => id, [...path, "gameplayTagGroups", group.field]);
      for (const id of group.tagIds) if (!tags.has(id)) issue(path, `Unknown tag ${id}`);
    }
    if (isGroupRecord(record)) {
      if (record.memberIds !== null) {
        const type = {
          "furniture.set": "furniture",
          "clothing.set": "clothing",
          "creatures.series": "creature",
          "plants.series": "plant",
          "dishes.series": "dish",
        }[record.type];
        checkItems(record.memberIds, [...path, "memberIds"], type);
      }
      return;
    }
    if ("trade" in record)
      for (const offer of record.trade?.offers ?? [])
        if (offer.currencyItemId !== null) checkItems([offer.currencyItemId], [...path, "trade"]);
    if (record.type === "plant") {
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
      record.type === "creature" &&
      record.size?.min != null &&
      record.size.max !== null &&
      record.size.min > record.size.max
    )
      issue(path, "Invalid size range");
    if (record.type === "dish") {
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
    const seen = new Set<number>();
    let id: number | null = category.id;
    while (id !== null) {
      if (seen.has(id)) {
        issue(["ingredientCategories", index], "Ingredient category cycle");
        break;
      }
      seen.add(id);
      const parent = categories.get(id);
      if (!parent) {
        issue(["ingredientCategories", index], `Unknown ingredient category ${id}`);
        break;
      }
      id = parent.parentId;
    }
  }
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
      catalog.records.filter((record) => record.type === "seed"),
      catalog.growths,
      new Set(
        catalog.records.filter((record) => record.type === "plant").map((record) => record.id),
      ),
    ).map((entry) => ({ ...entry, path: ["catalog", ...entry.path] })),
  );
  return issues;
}
