import { Link } from "@tanstack/react-router";
import { Badge } from "@/ui/components/badge";
import { catalogSearchForTag } from "../catalog/search";
import {
  DetailTitleMetadata,
  type DetailField,
  type DetailFieldGroup,
} from "../detail-page/detail-fields";
import { ItemIngredientTags } from "../ingredients/item-usage";
import { categoryNames, type CatalogEntryRow } from "./catalog";
import { CatalogRelations, collectionLabels } from "./detail-relations";
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
    fields.push([
      label,
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) =>
          tag.filterable && tag.id !== null ? (
            <Badge
              key={tag.id}
              variant="secondary"
              render={<Link to="/catalog" search={catalogSearchForTag(tag.id)} />}
            >
              {tag.name}
            </Badge>
          ) : (
            <Badge key={tag.id ?? tag.name} variant="secondary">
              {tag.name}
            </Badge>
          ),
        )}
      </div>,
      { fullWidth: tags.length > 1 },
    ]);
  if (overview.ingredientTags.length)
    fields.push([
      "食材标签",
      <ItemIngredientTags tags={overview.ingredientTags} />,
      { anchor: "item-ingredient-tags", fullWidth: true },
    ]);
  const first = overview.memberships[0];
  if (first) {
    const { group, anchor } = collectionLabels[first.kind];
    const [primary, ...others] = overview.memberships;
    fields.push([
      `所属${group}`,
      <>
        <CatalogRelations items={[primary]} />
        {others.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm">
              其他{group}（{others.length}）
            </summary>
            <CatalogRelations items={others} />
          </details>
        )}
        {overview.hasUnconfirmedMembership && (
          <span className="text-xs text-muted-foreground">其他{group}的成员关系未确认</span>
        )}
      </>,
      { anchor, fullWidth: others.length > 0 || overview.hasUnconfirmedMembership },
    ]);
  }
  fields.push(...(presentation.fields ?? []), ...extraFields);
  const groups: DetailFieldGroup[] = [{ fields }];
  if (presentation.typeSpecificGroup) groups.push(presentation.typeSpecificGroup);
  return groups.map((group) => ({
    ...group,
    fields: group.fields.filter(([, value]) => value != null && value !== ""),
  }));
}
