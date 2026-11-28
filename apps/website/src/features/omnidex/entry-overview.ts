import { createRecordTagResolver } from "@loomix/schema/catalog";
import { tagLabel } from "@loomix/schema/gameplay-tags";
import { ingredientUsage } from "../ingredients/model";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";

type OverviewTag = { id: number | null; name: string; filterable: boolean };
type TagGroup = { label: string; tags: OverviewTag[] };

export function entryOverview(data: OmnidexCatalog, { record }: CatalogEntryRow) {
  if ("memberKind" in record)
    return { tagGroups: [], memberships: [], ingredientTags: [], hasUnconfirmedMembership: false };
  const resolve = createRecordTagResolver(data.tagIndex);
  const tagGroups: TagGroup[] = [];
  for (const [label, facet] of [
    ["颜色", "colors"],
    ["材质", "materials"],
    ["风格", "styles"],
  ] as const) {
    let tags = resolve(record, facet).map((tag) => ({
      id: tag.id,
      name: tagLabel(tag),
      filterable: data.tags.acceptSelection([String(tag.id)]).length > 0,
    }));
    if (facet === "colors" && record.kind === "plant" && record.flowerColors?.length) {
      const colors = new Set(record.flowerColors);
      const flowerTags = [...colors].flatMap<OverviewTag>((name) => {
        const matches = tags.filter((tag) => tag.name === name);
        return matches.length ? matches : [{ id: null, name, filterable: false }];
      });
      tagGroups.push({ label: "花色", tags: flowerTags });
      tags = tags.filter((tag) => !colors.has(tag.name));
    }
    if (tags.length) tagGroups.push({ label, tags });
  }
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
