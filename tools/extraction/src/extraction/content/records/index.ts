import { profile } from "../../../profile.ts";
import { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { buildCategory, buildCommon, evidence } from "./common.ts";
import { buildFurnitureItem } from "./furniture.ts";
import { buildCreatureItem } from "./creatures.ts";
import { buildPlantItem } from "./plants.ts";
import { buildDishItem } from "./dishes.ts";
import { buildClothingItem } from "./clothing.ts";
export function buildRecord(context: ContentContext, record: RecordContext): RecordBuilder {
  const listed = record.row
    ? context.tables.byte(record.row, profile.fields.content.appearanceFlag, 0) === 0
    : null;
  const builder = new RecordBuilder(record.group, record.id, listed);
  buildCommon(builder, context, record);
  const [category, kind] = record.group.split(".");
  const manual = context.scope.manual.get(record.id);
  const classification = manual ?? [
    evidence(profile.roots.items, [2, 6, 15]),
    evidence(profile.roots.categories, [0, 5]),
  ];
  builder.put("category", category, classification);
  builder.put(
    "kind",
    kind,
    manual ?? [evidence(profile.roots.items, 2), evidence(profile.roots.content, 1)],
  );
  if (kind === "set" || kind === "series") {
    builder.put(
      "memberIds",
      context.scope.membersOf(record.id),
      kind === "series"
        ? evidence(profile.roots.ui, profile.fields.ui.series)
        : evidence(category === "clothing" ? profile.roots.clothing : profile.roots.furniture, 9),
      "no_confirmed_membership_backreference",
    );
  } else {
    if (category === "dishes" || category === "miscellaneous") {
      builder.put(
        "subcategory",
        null,
        manual ?? evidence(profile.roots.categories, 4),
        "subcategory_not_configured",
      );
    } else buildCategory(builder, context, record);
    switch (record.group) {
      case "furniture.item":
        buildFurnitureItem(builder, context, record);
        break;
      case "creatures.item":
        buildCreatureItem(builder, context, record);
        break;
      case "plants.item":
        buildPlantItem(builder, context, record);
        break;
      case "dishes.item":
        buildDishItem(builder, context, record);
        break;
      case "clothing.item":
        buildClothingItem(builder, context, record);
        break;
    }
  }
  return builder;
}
