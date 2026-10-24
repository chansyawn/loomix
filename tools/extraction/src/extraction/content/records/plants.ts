import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";

export function buildPlantItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { main, id } = record;
  builder.put(
    "attributes.originGalaxy",
    vocabulary.renderTags(vocabulary.tags(main, 8)),
    evidence(profile.roots.items, 8),
    "origin_tag_missing_or_display_unresolved",
  );

  const crop = vocabulary.cropsByProduct.get(id);
  builder.put(
    "attributes.harvestCount",
    crop ? tables.uint(crop, 5) : null,
    evidence(profile.roots.crops, [5, 10]),
    "not_in_confirmed_crop_product_vector",
  );
  builder.candidates.push({
    id,
    group: record.group,
    value: null,
    status: "unconfirmed",
    reason: "daily_stage_duration_and_first_harvest_rule_unconfirmed",
    association: "144.10 product vector contains item ID",
    transformation: "retain mode/stages; do not infer elapsed days",
    sources: crop
      ? [
          {
            file: "prepared/ed.obb",
            table: profile.roots.crops,
            rowOffset: crop.rowOffset,
            fields: [3, 4, 10],
          },
        ]
      : [],
    field: "attributes.maturityPeriod",
    table: profile.roots.crops,
    seedId: crop ? tables.uint(crop, 0) : null,
    mode: tables.string(crop, 3),
    stages: tables.vector(crop, 4),
  });
  builder.put(
    "attributes.maturityPeriod",
    null,
    evidence(profile.roots.crops, [3, 4]),
    "daily_stage_duration_and_first_harvest_rule_unconfirmed",
  );
}
