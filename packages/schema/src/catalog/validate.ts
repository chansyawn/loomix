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
    "items",
    "groups",
    "appearances",
    "seeds",
    "growths",
    "ingredientCategories",
  ] as const)
    unique<{ id: number }>(catalog[name], (value) => value.id, [name]);
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const groups = new Map(catalog.groups.map((group) => [group.id, group]));
  const appearances = new Map(catalog.appearances.map((item) => [item.id, item]));
  const growths = new Map(catalog.growths.map((growth) => [growth.id, growth]));
  const categories = new Map(
    catalog.ingredientCategories.map((category) => [category.id, category]),
  );
  const checkItems = (ids: readonly number[], path: (string | number)[], type?: string) => {
    unique(ids, (id) => id, path);
    ids.forEach((id, index) => {
      const item = items.get(id);
      if (!item || (type && item.type !== type))
        issue([...path, index], `Unknown ${type ?? "item"} ${id}`);
    });
  };
  const expression = (value: IngredientExpression, path: (string | number)[]) => {
    if (value.kind === "category") {
      if (!categories.has(value.categoryId))
        issue(path, `Unknown ingredient category ${value.categoryId}`);
    } else value.terms.forEach((term, index) => expression(term, [...path, "terms", index]));
  };
  unique(catalog.entries, (entry) => `${entry.entity.kind}:${entry.entity.id}`, ["entries"]);
  catalog.entries.forEach((entry, index) => {
    const { id, kind } = entry.entity;
    const entity =
      kind === "item" ? items.get(id) : kind === "group" ? groups.get(id) : appearances.get(id);
    if (!entity || ("type" in entity && entity.type === "reference"))
      issue(["entries", index], "Entry requires a classified entity");
  });
  const groupTypes = {
    furniture: "furniture",
    clothing: "clothing",
    creatures: "creature",
    plants: "plant",
    dishes: "dish",
  };
  catalog.groups.forEach((group, index) => {
    if (group.memberIds !== null)
      checkItems(
        group.memberIds,
        ["groups", index, "memberIds"],
        groupTypes[group.type.split(".")[0] as keyof typeof groupTypes],
      );
  });
  catalog.ingredientCategories.forEach((category, index) => {
    checkItems(category.itemIds, ["ingredientCategories", index, "itemIds"]);
    const seen = new Set<number>();
    let current: number | null = category.id;
    while (current !== null) {
      if (seen.has(current)) {
        issue(["ingredientCategories", index, "parentId"], "Ingredient category cycle");
        break;
      }
      seen.add(current);
      const parent = categories.get(current);
      if (!parent) {
        issue(
          ["ingredientCategories", index, "parentId"],
          `Unknown ingredient category ${current}`,
        );
        break;
      }
      current = parent.parentId;
    }
  });
  unique(catalog.ingredientCategories, (category) => category.tagName, ["ingredientCategories"]);
  const checkGrowth = (id: number | null, path: (string | number)[]) => {
    if (id !== null && !growths.has(id)) issue(path, `Unknown growth ${id}`);
  };
  catalog.seeds.forEach((seed, index) => {
    checkItems(seed.productIds, ["seeds", index, "productIds"], "plant");
    checkGrowth(seed.growthId, ["seeds", index, "growthId"]);
  });
  catalog.growths.forEach((growth, index) => {
    unique(growth.stages ?? [], (stage) => stage.id, ["growths", index, "stages"]);
    const stages = new Set(growth.stages?.map((stage) => stage.id));
    for (const id of [
      ...(growth.stageIds ?? []),
      ...(growth.regrowthStageIds ?? []),
      ...(growth.witheredStageId === null ? [] : [growth.witheredStageId]),
    ])
      if (!stages.has(id)) issue(["growths", index], `Unknown growth stage ${id}`);
    checkItems(
      [...new Set(growth.matureStages?.map((stage) => stage.productId) ?? [])],
      ["growths", index, "matureStages"],
      "plant",
    );
  });
  catalog.items.forEach((item, index) => {
    const path = ["items", index];
    if (item.type === "reference") return;
    for (const [offerIndex, offer] of (item.trade?.offers ?? []).entries())
      if (offer.currencyItemId !== null)
        checkItems(
          [offer.currencyItemId],
          [...path, "trade", "offers", offerIndex, "currencyItemId"],
        );
    if (item.type === "plant") {
      checkGrowth(item.growthId, [...path, "growthId"]);
      checkItems(item.drops?.map((drop) => drop.itemId) ?? [], [...path, "drops"]);
      item.drops?.forEach((drop, dropIndex) => {
        if (
          drop.quantityMin !== null &&
          drop.quantityMax !== null &&
          drop.quantityMin > drop.quantityMax
        )
          issue([...path, "drops", dropIndex], "Invalid drop quantity range");
      });
      item.hybridRecipes?.forEach((recipe, recipeIndex) =>
        checkItems(
          [...recipe.parents.map((parent) => parent.itemId), recipe.productId],
          [...path, "hybridRecipes", recipeIndex],
          "plant",
        ),
      );
    }
    if (
      item.type === "creature" &&
      item.size?.min !== null &&
      item.size?.max !== null &&
      item.size &&
      item.size.min > item.size.max
    )
      issue([...path, "size"], "Invalid size range");
    if (item.type === "furniture") {
      unique(item.craftingRecipes ?? [], (recipe) => recipe.id, [...path, "craftingRecipes"]);
      item.craftingRecipes?.forEach((recipe, recipeIndex) =>
        checkItems(recipe.materials?.map((material) => material.itemId) ?? [], [
          ...path,
          "craftingRecipes",
          recipeIndex,
          "materials",
        ]),
      );
    }
    if (item.type === "dish") {
      unique(item.recipe?.slots ?? [], (slot) => slot.field, [...path, "recipe", "slots"]);
      item.recipe?.slots?.forEach((slot, slotIndex) => {
        const slotPath = [...path, "recipe", "slots", slotIndex];
        if ((slot.expression === null) !== (slot.itemIds === null))
          issue(slotPath, "Expression and candidates must have the same resolution state");
        if (slot.expression) expression(slot.expression, [...slotPath, "expression"]);
        if (slot.itemIds) checkItems(slot.itemIds, [...slotPath, "itemIds"]);
      });
      if (item.tastes) unique(item.tastes, (taste) => taste, [...path, "tastes"]);
    }
  });
  return issues;
}
