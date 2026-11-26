import { localizedSources } from "../collection/evidence.ts";
import type { RecordType } from "../../../schema.ts";
import type { IconMatch, Row, TableEvidence } from "../../../types.ts";
import { plainText } from "../model.ts";
import { profile } from "../../../../profile.ts";
import type { RecordBuilder } from "../field.ts";
import type { ContentContext } from "../context.ts";
import type { RecordContext } from "./types.ts";

const evidence = (
  context: Pick<ContentContext, "tables">,
  row: Row,
  fields: number | number[],
  note?: string,
  textFields: number[] = [],
): TableEvidence => ({
  table: row?.root ?? 0,
  field: fields,
  sources: row
    ? [
        {
          file: "prepared/ed.obb",
          table: row.root,
          rowOffset: row.rowOffset,
          fields: Array.isArray(fields) ? fields : [fields],
        },
        ...textFields.flatMap((field) => localizedSources(context.tables, row, [field]).slice(1)),
      ]
    : [],
  ...(note ? { note } : {}),
});

export function selectImageReferences(
  group: RecordType,
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

  builder.put("id", id, evidence(context, main, fields.items.id));
  builder.put(
    "name",
    plainText(tables.text(main, fields.items.name)),
    evidence(context, main, fields.items.name, undefined, [fields.items.name]),
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
      evidence(context, row, 4, undefined, [4]),
      evidence(context, creature, fields.creatures.description),
      evidence(context, ui, fields.ui.description, undefined, [fields.ui.description]),
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
      evidence(context, ui, fields.ui.quality),
      ...tables
        .rows(profile.roots.qualities)
        .filter((row) => tables.uint(row, 1, 0) === quality)
        .map((row) => evidence(context, row, 1)),
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
  const appearance = context.scope.appearances.admitted.get(record.id);
  if (appearance) {
    const source = evidence(context, record.main, profile.fields.items.tagType);
    const tag = context.vocabulary.tagIndex.findByName(appearance.tag);
    builder.put("subcategory", appearance.category, {
      ...source,
      sources: [...(source.sources ?? []), ...(tag ? context.gameplayTags.sources(tag.id) : [])],
    });
    return;
  }
  builder.put(
    "subcategory",
    context.scope.categories.get(record.id),
    context.scope.manual.get(record.id) ?? [
      evidence(context, record.main, [6, 15]),
      ...context.tables
        .rows(profile.roots.categories)
        .map((row) => evidence(context, row, [0, 4, 5], undefined, [4])),
    ],
  );
}
