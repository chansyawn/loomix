import { Link } from "@tanstack/react-router";
import { Badge } from "@/ui/components/badge";
import { catalogSearchForTag } from "../catalog/search";
import type { DetailField } from "../detail-page/detail-page";
import { ItemIngredientTags } from "../ingredients/item-usage";
import { categoryNames, type CatalogEntryRow } from "./catalog";
import { CatalogRelations, collectionLabels } from "./detail-relations";
import type { EntryOverview } from "./entry-overview";

export function overviewFields(
  row: CatalogEntryRow,
  overview: EntryOverview,
  specific: readonly DetailField[],
): DetailField[] {
  const category =
    "memberKind" in row.record
      ? collectionLabels[row.record.memberKind].name
      : categoryNames[row.category];
  const fields: DetailField[] = [
    ["编号", String(row.id)],
    ["图鉴类别", category],
    ...specific.filter(
      ([label, value]) =>
        value != null && value !== "" && !(label === "分类" && value === category),
    ),
  ];
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
    ]);
  if (overview.ingredientTags.length)
    fields.push([
      "食材标签",
      <ItemIngredientTags tags={overview.ingredientTags} />,
      "item-ingredient-tags",
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
      anchor,
    ]);
  }
  return fields;
}
