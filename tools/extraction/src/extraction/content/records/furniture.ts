import { furnitureSize } from "../../../tasks/content/model.ts";
import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";

export function buildFurnitureItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { main, ui } = record;
  for (const [field, index] of [
    ["colors", 9],
    ["materials", 11],
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

  const direct = new Set(vocabulary.tags(main, 6));
  let matches = vocabulary.furnitureTypes.filter((row) =>
    vocabulary.tags(row, 5).some((tag) => direct.has(tag)),
  );
  if (!matches.length)
    matches = vocabulary.furnitureTypes.filter((row) =>
      vocabulary.tags(row, 3).some((tag) => direct.has(tag)),
    );
  const labels = [
    ...new Set(
      matches
        .map((row) => {
          const prefix = tables.text(row, 2);
          const label = tables.text(row, 4);
          return prefix && label ? `${prefix}·${label}` : null;
        })
        .filter((label): label is string => Boolean(label)),
    ),
  ];
  builder.put(
    "type",
    labels.length === 1 ? labels[0] : null,
    evidence(profile.roots.furnitureTypes, [2, 4, 5]),
    "type_filter_unmatched_or_ambiguous",
  );

  const sizes = [
    ...new Set(
      vocabulary
        .tags(main, 14)
        .map(furnitureSize)
        .filter((size): size is string => Boolean(size)),
    ),
  ];
  builder.put(
    "size",
    sizes.length === 1 ? sizes[0] : null,
    evidence(profile.roots.items, 14),
    "size_tag_missing_or_ambiguous",
  );
}
