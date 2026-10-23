import type { ContentGroup } from "@loomix/content-schema";
import type { IconMatch, Row, TableEvidence } from "../../../tasks/content/types.ts";
import { plainText } from "../../../tasks/content/model.ts";
import { profile } from "../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";

const evidence = (table: number, field: number | number[], note?: string): TableEvidence => ({
  table,
  field,
  ...(note ? { note } : {}),
});

export function selectImageReferences(
  group: ContentGroup,
  tables: ContentContext["tables"],
  ui: Row,
): string[] {
  if (group.endsWith(".series")) {
    // 这 67 个主题复用了无关家具的奖励图或占位图。
    // 仅有配置路径不足以证明图片展示的是该系列。
    return [];
  }
  const fields = profile.fields.ui;
  return [tables.string(ui, fields.largeIcon), tables.string(ui, fields.smallIcon)].filter(
    (value): value is string => Boolean(value),
  );
}

export function buildCommon(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const { tables, vocabulary } = context;
  const { id, group, row, main, ui, creature } = record;
  const fields = profile.fields;

  builder.put("id", id, evidence(profile.roots.content, fields.content.id));
  builder.put(
    "name",
    plainText(tables.text(main, fields.items.name)),
    evidence(profile.roots.items, fields.items.name),
    "name_textmap_missing",
  );
  if (!builder.record.name) throw new Error(`Unresolved item name ${id}`);

  // 根字段 93 的生物介绍已本地化，优先于物品的简短说明。
  const description =
    tables.text(row, 4) ??
    tables.string(creature, fields.creatures.description) ??
    tables.text(ui, fields.ui.description);
  builder.put(
    "description",
    plainText(description),
    [
      evidence(profile.roots.content, 4),
      evidence(profile.roots.creatures, fields.creatures.description),
      evidence(profile.roots.ui, fields.ui.description),
    ],
    "description_not_configured_or_textmap_missing",
  );

  const quality = ui ? tables.uint(ui, fields.ui.quality, 0) : null;
  if (quality !== null && !vocabulary.qualityLabels.has(quality))
    throw new Error(`Unknown quality ${quality}`);
  builder.put(
    "quality",
    quality,
    [
      evidence(profile.roots.ui, fields.ui.quality),
      evidence(profile.roots.qualities, 1, "0–4, omitted scalar defaults to 0"),
    ],
    "no_ui_record",
  );

  const references = selectImageReferences(group, tables, ui);
  const matches = references
    .map((reference) => context.resolveIcon(reference))
    .filter((match): match is IconMatch => !!match?.matched);
  for (const chosen of matches) {
    if (!chosen.resourceName || !chosen.source || !chosen.container || !chosen.pathId)
      throw new Error(`Incomplete selected image ${id}`);
    builder.images.push({
      ...chosen,
      id,
      group,
      resourceName: chosen.resourceName,
      source: chosen.source,
      container: chosen.container,
      pathId: chosen.pathId,
    });
  }
  if (!matches.length)
    builder.put(
      "image",
      null,
      references,
      group.endsWith(".series")
        ? "series_picture_purpose_unconfirmed"
        : references.length
          ? "configured_resource_missing"
          : "image_not_configured",
    );
}

export { evidence };

export function buildCategory(
  builder: RecordBuilder,
  context: ContentContext,
  record: RecordContext,
): void {
  const appearance = record.group === "clothing.appearances";
  builder.put(
    "category",
    context.scope.categories.get(record.id),
    evidence(
      appearance ? profile.roots.items : profile.roots.categories,
      appearance ? profile.fields.items.category : 4,
    ),
  );
}
