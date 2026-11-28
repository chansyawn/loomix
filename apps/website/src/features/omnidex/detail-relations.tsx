import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { CollectionMemberKind } from "@loomix/schema/catalog";
import type { DetailField, DetailSection } from "../detail-page/detail-page";
import type { CatalogEntrySummary } from "../omnidex-view";
import { catalogEntryLocation } from "./entry-location";
import { GameplayRelationItem } from "./gameplay-relation-item";

export const collectionLabels = {
  furniture: { name: "家具套组", group: "套组", unit: "件家具", anchor: "related-furniture" },
  clothing: { name: "服饰套装", group: "套装", unit: "件服装", anchor: "related-clothing" },
  creature: { name: "生物系列", group: "系列", unit: "种生物", anchor: "related-creatures" },
  plant: { name: "植物系列", group: "系列", unit: "种植物", anchor: "plant-members" },
  dish: { name: "菜肴系列", group: "系列", unit: "道菜肴", anchor: "related-dishes" },
} satisfies Record<CollectionMemberKind, object>;

export function SectionCount({ anchor, children }: { anchor: string; children: ReactNode }) {
  return (
    <Link
      to="."
      hash={anchor}
      search={true}
      state={true}
      resetScroll={false}
      className="underline underline-offset-4"
    >
      {children}
    </Link>
  );
}

export function collectionMembers<Member extends { id: number }>(
  kind: CollectionMemberKind,
  items: Member[] | null,
  renderItem: (item: Member) => ReactNode,
): { fields: DetailField[]; sections: DetailSection[] } {
  const { group, anchor, unit } = collectionLabels[kind];
  const title = `${group}成员`;
  return {
    fields: [
      [
        "成员数量",
        <SectionCount anchor={anchor}>
          {items === null ? "尚未确认" : `${items.length} ${unit}`}
        </SectionCount>,
      ],
    ],
    sections: [
      {
        id: anchor,
        title,
        content: items?.length ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
            {items.map((item) => (
              <li className="min-w-0" key={item.id}>
                {renderItem(item)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {items === null ? `${title}尚未确认` : `该${group}暂无成员`}
          </p>
        ),
      },
    ],
  };
}

type RelatedEntry = Pick<CatalogEntrySummary, "id" | "name" | "image"> & { browsable?: boolean };

export function CatalogRelations({ items }: { items: readonly RelatedEntry[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.id} className="max-w-full min-w-0">
          <GameplayRelationItem
            variant="inline"
            name={item.name}
            image={item.image}
            destination={item.browsable === false ? undefined : catalogEntryLocation(item)}
          />
        </li>
      ))}
    </ul>
  );
}

export function addDetailRelation(
  fields: DetailField[],
  sections: DetailSection[],
  label: string,
  anchor: string,
  items: readonly RelatedEntry[],
  fieldAlias?: string,
) {
  if (!items.length) return;
  const content = <CatalogRelations items={items} />;
  if (items.length === 1) fields.push([label, content, anchor, fieldAlias]);
  else sections.push({ id: anchor, title: label, content });
}
