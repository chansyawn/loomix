import { expect, test } from "vite-plus/test";
import { createFixture } from "../neighbors/fixtures/tables.ts";
import { readCookingRecipes } from "./cooking.ts";
import { cookingEvidence } from "./cooking-evidence.ts";
import { FieldEvidenceSchema } from "../evidence/domain-schema.ts";

test("独立配方保留源身份、产物和未知 slots，不将同号菜肴当秘方物品", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [[200, { text: "同号菜肴" }, 204]],
    122: [[200, null, 4, null, 300]],
    121: [[4, { text: "入门" }]],
    126: [],
  });
  onTestFinished(fixture.cleanup);
  const { tables } = fixture.input;
  const context = {
    tables,
    recipesByProduct: new Map([[300, tables.rows(122)[0]!]]),
    ingredientCategoryBuild: {
      categories: [],
      byTagName: new Map(),
      unlistedReferences: [],
      associations: [],
    },
    vocabulary: { difficulties: tables.byId(121), cookware: tables.rows(126) },
  };
  const recipes = readCookingRecipes(context);
  const fields = cookingEvidence(context, recipes);
  expect(() => fields.map((field) => FieldEvidenceSchema.parse(field))).not.toThrow();
  expect(fields.find((field) => field.fieldPath === "cooking.slots")).toMatchObject({
    status: "unresolved",
    reasonCode: "ingredient_slot_runtime_semantics_unconfirmed",
  });
  expect(fields.find((field) => field.fieldPath === "cooking.tastes")).toMatchObject({
    status: "absent",
    reasonCode: "cooking_field_not_configured",
  });
  expect(recipes).toEqual([
    {
      id: 200,
      productId: 300,
      difficulty: "入门",
      unlockCondition: null,
      cookware: null,
      tastes: null,
      slots: null,
    },
  ]);
});
