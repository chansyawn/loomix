import { plainText } from "../model.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";
import { evidence } from "./common.ts";

export function buildDishItem(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { main, ui } = record;
  builder.put(
    "attributes.galaxyFlavor",
    vocabulary.renderTags(vocabulary.tags(main, 8)),
    evidence(context, main, 8),
    "flavor_tag_missing_or_unresolved",
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
      context,
      ui,
      [8, 9],
      "TextMap 4027993099: 增加 %s 力气; unresolved buffs are not omitted",
    ),
    "effect_missing_or_additional_buff_unresolved",
  );
}
