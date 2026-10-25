import { plainText } from "../model.ts";
import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";
import { recipeSlots } from "../recipes.ts";

export function buildDishItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { main, ui } = record;
  const recipe = record.recipe;
  const difficulty = vocabulary.difficulties.get(tables.uint(recipe, 2));
  builder.put(
    "attributes.difficulty",
    tables.text(difficulty, 1),
    evidence(profile.roots.recipes, [2, 4]),
    "recipe_difficulty_unresolved",
  );
  builder.put(
    "attributes.galaxyFlavor",
    vocabulary.renderTags(vocabulary.tags(main, 8)),
    evidence(profile.roots.items, 8),
    "flavor_tag_missing_or_unresolved",
  );
  const cookware = vocabulary.cookware.filter(
    (row) => tables.uint(row, 2) === tables.uint(recipe, 16),
  );
  builder.put(
    "attributes.cookware",
    cookware.length === 1 ? tables.string(cookware[0], 1) : null,
    [evidence(profile.roots.recipes, [4, 16]), evidence(profile.roots.cookware, [1, 2])],
    "cookware_enum_unresolved",
  );
  const strength = tables.uint(ui, 8);
  const effectTemplate = tables.textmap[4027993099]?.nameZh;
  const hasOtherEffect = tables.uint(ui, 9, 0) !== 0;
  builder.put(
    "attributes.effects",
    strength != null && effectTemplate && !hasOtherEffect
      ? plainText(effectTemplate.replace("%s", String(strength)))
      : null,
    evidence(
      profile.roots.ui,
      [8, 9],
      "TextMap 4027993099: 增加 %s 力气; unresolved buffs are not omitted",
    ),
    "effect_missing_or_additional_buff_unresolved",
  );
  const slots = recipe
    ? recipeSlots(
        recipe,
        tables,
        context.ingredientCategoryBuild.byTagName,
        new Map(
          context.ingredientCategoryBuild.categories.map((category) => [category.id, category]),
        ),
      ).slots
    : null;
  builder.put(
    "recipe",
    recipe ? { slots } : null,
    evidence(profile.roots.recipes, [0, 2, 4, 16, 20, 25, 30, 35]),
    recipe
      ? slots === null
        ? "ingredient_slots_absent_semantics_unconfirmed"
        : "ingredient_expression_semantics_unconfirmed"
      : "recipe_row_missing",
    recipe ? "unconfirmed" : undefined,
  );
}
