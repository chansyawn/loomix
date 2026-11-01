import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";
import { creatureSizeRange } from "../model.ts";

export function buildCreatureItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { ui, id } = record;
  for (const [field, index] of [
    ["attributes.region", profile.fields.ui.region],
    ["attributes.habitat", profile.fields.ui.habitat],
    ["attributes.activeSeasons", profile.fields.ui.seasons],
    ["attributes.activeTimes", profile.fields.ui.times],
    ["attributes.activeWeather", profile.fields.ui.weather],
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
  const multiplier = tables.float(scale, 6);
  builder.put(
    "attributes.sizeRange",
    creatureSizeRange(min, max, multiplier),
    evidence(
      profile.roots.creatureScale,
      [3, 4, 5, 6],
      "Multiply table 132.4/5 by 132.6; 132.3 is not part of the displayed size range",
    ),
    "creature_size_configuration_missing",
  );
}
