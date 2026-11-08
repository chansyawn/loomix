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
  const { vocabulary } = context;
  const { main } = record;
  builder.put(
    "attributes.originGalaxy",
    vocabulary.renderTags(vocabulary.tags(main, 8)),
    evidence(profile.roots.items, 8),
    "origin_tag_missing_or_display_unresolved",
  );
}
