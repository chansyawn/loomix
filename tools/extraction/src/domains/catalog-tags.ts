import type { Catalog, CatalogRecord } from "@loomix/schema/catalog";
import type { ContentContext } from "../extraction/content/context.ts";

export function createRecordMetadata(context: ContentContext) {
  const { tables, vocabulary } = context;
  const byName = new Map(Object.values(vocabulary.tree).map((tag) => [tag.TagName, tag]));
  const used = new Set<number>();
  const metadata = (id: number, seed = false) => {
    const row = context.main.get(id);
    const clientType = tables.uint(row, 2);
    if (!row || clientType === null) throw new Error(`Missing main item/type ${id}`);
    const admissionReasons: CatalogRecord["admissionReasons"] = [];
    if (context.scope.encyclopedia.has(id)) admissionReasons.push("encyclopedia");
    if (context.scope.manual.has(id)) admissionReasons.push("manual");
    if (seed) admissionReasons.push("deterministicSeed");
    if (!admissionReasons.length) throw new Error(`Item is outside admission scope ${id}`);
    const gameplayTagGroups: CatalogRecord["gameplayTagGroups"] = [];
    for (const field of [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const) {
      const tagIds = [
        ...new Set(
          vocabulary.tags(row, field).map((name) => {
            const tag = byName.get(name);
            if (!tag) throw new Error(`Unknown GameplayTag ${id}.${field}: ${name}`);
            let node: typeof tag | undefined = tag;
            const seen = new Set<number>();
            while (node) {
              if (seen.has(node.TagId)) throw new Error(`GameplayTag cycle ${name}`);
              seen.add(node.TagId);
              used.add(node.TagId);
              node = vocabulary.tree[node.ParentId];
            }
            return tag.TagId;
          }),
        ),
      ];
      gameplayTagGroups.push({ field, tagIds });
    }
    return {
      admissionReasons,
      clientType,
      clientSecondaryType: tables.uint(row, 3),
      gameplayTagGroups,
    };
  };
  const dictionary = (): Catalog["gameplayTags"] =>
    [...used]
      .sort((a, b) => a - b)
      .map((id) => {
        const tag = vocabulary.tree[id]!;
        return {
          id,
          name: tag.TagName,
          enumName: tag.EnumName ?? null,
          parentId: vocabulary.tree[tag.ParentId] ? tag.ParentId : null,
          displayName: vocabulary.translateTag(tag.TagName),
        };
      });
  return { metadata, dictionary };
}
