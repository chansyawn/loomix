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
  const { vocabulary } = context;
  const { main } = record;
  for (const [field, index] of [
    ["attributes.colors", 9],
    ["attributes.materials", 11],
    ["attributes.styles", 12],
  ] as const)
    builder.put(
      field,
      vocabulary.renderTags(vocabulary.tags(main, index)),
      evidence(profile.roots.items, index, "GameplayTag → TagUIData → TextMap"),
      "tag_missing_or_display_unresolved",
    );
}
