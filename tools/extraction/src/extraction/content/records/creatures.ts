import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";

export function buildCreatureItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { row, ui, id } = record;
  for (const [field, index] of [
    ["region", profile.fields.ui.region],
    ["habitat", profile.fields.ui.habitat],
    ["activeSeasons", profile.fields.ui.seasons],
    ["activeTimes", profile.fields.ui.times],
    ["activeWeather", profile.fields.ui.weather],
  ] as const)
    builder.put(
      field,
      vocabulary.renderDisplay(tables.string(ui, index)),
      evidence(profile.roots.ui, index, "display key → localized TextMap"),
      "display_key_missing_or_unresolved",
    );

  const scale = vocabulary.scales.get(id);
  const min = tables.uint(scale, 4);
  const max = tables.uint(scale, 5);
  // 显示单位或换算比例确认前，仅将数值范围的端点保留为候选值。
  builder.candidates.push({
    id,
    group: record.group,
    value: null,
    status: "unconfirmed",
    reason: "size_units_and_conversion_unconfirmed",
    association: "132.0 = item ID",
    transformation: "retain native endpoints/scale; do not infer display units",
    sources: scale
      ? [
          {
            file: "prepared/ed.obb",
            table: profile.roots.creatureScale,
            rowOffset: scale.rowOffset,
            fields: [3, 4, 5, 6],
          },
        ]
      : [],
    field: "sizeRange",
    table: profile.roots.creatureScale,
    fields: [3, 4, 5, 6],
    min,
    max,
    scale: tables.float(scale, 3),
    extraScale: tables.float(scale, 6),
    taskText: tables.text(row, 8),
  });
  builder.put(
    "sizeRange",
    null,
    evidence(profile.roots.creatureScale, [3, 4, 5, 6]),
    "size_units_and_conversion_unconfirmed",
  );
}
