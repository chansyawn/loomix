import { ingredientUsage } from "../ingredients/model";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";
import { overviewTags } from "./overview-tags";

export function entryOverview(data: OmnidexCatalog, { record }: CatalogEntryRow) {
  if ("memberKind" in record)
    return {
      tagGroups: [],
      detailTags: { origin: [], furnitureType: [], furnitureSize: [] },
      filterTags: [],
      memberships: [],
      ingredientTags: [],
      hasUnconfirmedMembership: false,
    };
  const memberships = data.catalog.collections
    .filter((group) => group.memberIds?.includes(record.id))
    .map((group) => ({
      id: group.id,
      name: group.name,
      image: data.image(group.image),
      kind: group.memberKind,
    }));
  return {
    ...overviewTags(data, record),
    memberships,
    hasUnconfirmedMembership: data.catalog.collections.some(
      (group) => group.memberKind === record.kind && group.memberIds === null,
    ),
    ingredientTags: ingredientUsage(data.ingredients, record.id)?.tags ?? [],
  };
}

export type EntryOverview = ReturnType<typeof entryOverview>;
