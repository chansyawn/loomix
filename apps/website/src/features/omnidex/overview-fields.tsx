import { catalogSearchForTag } from "../catalog/search";
import {
  DetailTitleMetadata,
  type DetailField,
  type DetailFieldGroup,
} from "../detail-page/detail-fields";
import { ingredientFiltersForTag } from "../ingredients/search";
import { categoryNames, type CatalogEntryRow } from "./catalog";
import { catalogRelationEntry, collectionLabels } from "./detail-relations";
import type { EntryOverview } from "./entry-overview";
import type { CatalogDetailPresentation } from "./catalog-detail-presentation";
import { qualityNames } from "./quality";

export function CatalogTitleMetadata({
  row,
  classification,
}: {
  row: CatalogEntryRow;
  classification?: string | null;
}) {
  const category =
    "memberKind" in row.record
      ? collectionLabels[row.record.memberKind].name
      : categoryNames[row.category];
  return (
    <DetailTitleMetadata
      id={row.id}
      category={
        classification && classification !== category ? `${category} / ${classification}` : category
      }
    >
      {row.quality === null ? (
        "品阶未提供"
      ) : (
        <>
          <span className="sr-only">品阶：</span>
          {qualityNames[row.quality]}
        </>
      )}
    </DetailTitleMetadata>
  );
}

export function overviewFieldGroups(
  overview: EntryOverview,
  presentation: CatalogDetailPresentation,
  extraFields: readonly DetailField[],
): DetailFieldGroup[] {
  const fields: DetailField[] = [];
  for (const { label, tags } of overview.tagGroups)
    fields.push({
      kind: "tags",
      label,
      fullWidth: tags.length > 1,
      value: tags.map((tag) => ({
        key: tag.id ?? tag.name,
        name: tag.name,
        destination:
          tag.filterable && tag.id !== null
            ? { to: "/catalog", search: catalogSearchForTag(tag.id) }
            : undefined,
      })),
    });
  if (overview.ingredientTags.length)
    fields.push({
      kind: "tags",
      label: "食材标签",
      anchor: "item-ingredient-tags",
      fullWidth: true,
      value: overview.ingredientTags.map((tag) => ({
        key: tag.id,
        name: tag.name,
        destination: {
          to: "/dishes",
          search: { view: "ingredients", ingredients: ingredientFiltersForTag(tag) },
        },
      })),
    });
  const first = overview.memberships[0];
  if (first) {
    const { group, anchor } = collectionLabels[first.kind];
    fields.push({
      kind: "entries",
      label: `所属${group}`,
      anchor,
      moreLabel: `其他${group}`,
      value: overview.memberships.map(catalogRelationEntry),
      note: overview.hasUnconfirmedMembership ? `其他${group}的成员关系未确认` : undefined,
      fullWidth: overview.memberships.length > 1 || overview.hasUnconfirmedMembership,
    });
  }
  fields.push(...(presentation.fields ?? []), ...extraFields);
  const groups: DetailFieldGroup[] = [{ fields }];
  if (presentation.typeSpecificGroup) groups.push(presentation.typeSpecificGroup);
  return groups;
}
