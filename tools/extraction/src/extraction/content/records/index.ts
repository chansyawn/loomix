import { memberTargets } from "@loomix/content-schema";
import type { ContentGroup } from "@loomix/content-schema";
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
  const builder = new RecordBuilder(record.group, record.id);
  buildCommon(builder, context, record);
  const target = (memberTargets as Partial<Record<ContentGroup, readonly [string, ContentGroup]>>)[
    record.group
  ];
  if (target) buildMembership(builder, context, record, target);
  else if (record.group !== "miscellaneous") {
    if (record.group !== "dishes.items") buildCategory(builder, context, record);
    switch (record.group) {
      case "furniture.items":
        buildFurnitureItem(builder, context, record);
        break;
      case "creatures.items":
        buildCreatureItem(builder, context, record);
        break;
      case "plants.items":
        buildPlantItem(builder, context, record);
        break;
      case "dishes.items":
        buildDishItem(builder, context, record);
        break;
      case "clothing.items":
        buildClothingItem(builder, context, record);
        break;
      case "clothing.appearances":
        break;
    }
  }
  return builder;
}

function buildMembership(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
  target: readonly [string, ContentGroup],
): void {
  const [field] = target;
  builder.put(
    record.group === "clothing.sets" ? "setName" : "seriesName",
    builder.record.name,
    evidence(profile.roots.items, profile.fields.items.name),
  );
  builder.put(
    field,
    context.scope.membersOf(record.id),
    record.group.endsWith(".series")
      ? evidence(profile.roots.ui, profile.fields.ui.series)
      : evidence(
          record.group === "clothing.sets" ? profile.roots.clothing : profile.roots.furniture,
          9,
        ),
    "no_confirmed_membership_backreference",
  );
}
