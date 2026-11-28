import { createRecordTagResolver } from "@loomix/schema/catalog";
import { tagLabel } from "@loomix/schema/gameplay-tags";
import { ingredientUsage } from "../ingredients/model";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";

export function entryOverview(data: OmnidexCatalog, { record }: CatalogEntryRow) {
  if ("memberKind" in record)
    return { tagGroups: [], memberships: [], ingredientTags: [], hasUnconfirmedMembership: false };
  const resolve = createRecordTagResolver(data.tagIndex);
  const tagGroups = (
    [
      ["颜色", "colors"],
      ["材质", "materials"],
      ["风格", "styles"],
    ] as const
  ).flatMap(([label, facet]) => {
    const tags = resolve(record, facet).map((tag) => ({
      id: tag.id,
      name: tagLabel(tag),
      filterable: data.tags.acceptSelection([String(tag.id)]).length > 0,
    }));
    return tags.length ? [{ label, tags }] : [];
  });
  const memberships = data.catalog.collections
    .filter((group) => group.memberIds?.includes(record.id))
    .map((group) => ({
      id: group.id,
      name: group.name,
      image: data.image(group.image),
      kind: group.memberKind,
    }));
  return {
    tagGroups,
    memberships,
    hasUnconfirmedMembership: data.catalog.collections.some(
      (group) => group.memberKind === record.kind && group.memberIds === null,
    ),
    ingredientTags: ingredientUsage(data.ingredients, record.id)?.tags ?? [],
  };
}

export type EntryOverview = ReturnType<typeof entryOverview>;
