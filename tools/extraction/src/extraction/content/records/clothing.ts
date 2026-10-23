import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";

export function buildClothingItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { main, ui } = record;
  for (const [field, index] of [
    ["colors", 9],
    ["materials", 11],
    ["styles", 12],
  ] as const)
    builder.put(
      field,
      vocabulary.renderTags(vocabulary.tags(main, index)),
      evidence(profile.roots.items, index, "GameplayTag → TagUIData → TextMap"),
      "tag_missing_or_display_unresolved",
    );

  const sourceIds = tables.vector(ui, profile.fields.ui.sources);
  const sourceLabels = sourceIds?.map((code) => tables.text(vocabulary.sources.get(code), 1));
  builder.put(
    "sources",
    sourceLabels?.length && sourceLabels.every(Boolean)
      ? [...new Set(sourceLabels)].join("，")
      : null,
    [evidence(profile.roots.ui, profile.fields.ui.sources), evidence(profile.roots.sources, 1)],
    "source_not_configured_or_textmap_missing",
  );
}
