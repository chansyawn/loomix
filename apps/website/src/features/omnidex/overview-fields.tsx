import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "@/ui/components/badge";
import { catalogSearchForTag } from "../catalog/search";
import { DetailTitleMetadata, type DetailFieldGroup } from "../detail-page/detail-fields";
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
  { fields = [], relatedFields = [] }: CatalogDetailPresentation,
  owner: ReactNode,
  quote: string | null,
): DetailFieldGroup[] {
  const attributes = fields.filter(([, value]) => value != null && value !== "");
  const relations = [...relatedFields];
  for (const { label, tags } of overview.tagGroups)
    attributes.push([
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
    attributes.push([
      "食材标签",
      <ItemIngredientTags tags={overview.ingredientTags} />,
      { anchor: "item-ingredient-tags", fullWidth: true },
    ]);
  const first = overview.memberships[0];
  if (first) {
    const { group, anchor } = collectionLabels[first.kind];
    const [primary, ...others] = overview.memberships;
    relations.push([
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
  if (owner) relations.push(["友邻", owner]);
  return [
    { title: "物品属性", fields: attributes },
    { title: "关联条目", fields: relations },
    {
      title: "获取",
      fields: quote
        ? [["配置报价（每次购买）", quote, { anchor: "purchase-offers", fullWidth: true }]]
        : [],
    },
  ];
}
