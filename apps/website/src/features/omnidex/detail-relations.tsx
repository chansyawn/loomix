import { Link } from "@tanstack/react-router";
import type { CollectionMemberKind } from "@loomix/schema/catalog";
import type { DetailField, DetailSection } from "../detail-page/detail-page";
import type { CatalogEntrySummary } from "../omnidex-view";
import { catalogEntryLocation } from "./entry-location";
import { GameplayRelationItem } from "./gameplay-relation-item";
import { RecordListCard } from "./record-list-card";
import { RecordImage } from "./record-image";
import { useOmnidexOrigin } from "./navigation";
import { quantityField, type DetailEntry } from "../detail-page/field-model";

export const collectionLabels = {
  furniture: { name: "家具套组", group: "套组", unit: "件家具", anchor: "related-furniture" },
  clothing: { name: "服饰套装", group: "套装", unit: "件服装", anchor: "related-clothing" },
  creature: { name: "生物系列", group: "系列", unit: "种生物", anchor: "related-creatures" },
  plant: { name: "植物系列", group: "系列", unit: "种植物", anchor: "plant-members" },
  dish: { name: "菜肴系列", group: "系列", unit: "道菜肴", anchor: "related-dishes" },
} satisfies Record<CollectionMemberKind, object>;

function MemberCard({ item, tags }: { item: CatalogEntrySummary; tags: string | null }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      titleAs="p"
      name={item.name}
      quality={item.quality}
      tags={tags}
      image={<RecordImage image={item.image} name={item.name} />}
      titleLink={
        <Link {...catalogEntryLocation(item)} state={{ omnidexOrigin: origin }}>
          {item.name}
        </Link>
      }
    />
  );
}

export function collectionMembers<Member extends CatalogEntrySummary>(
  kind: CollectionMemberKind,
  items: Member[] | null,
  memberTags: (item: Member) => string | null,
): { fields: DetailField[]; sections: DetailSection[] } {
  const { group, anchor, unit } = collectionLabels[kind];
  const title = `${group}成员`;
  return {
    fields: [
      quantityField("成员数量", items === null ? "尚未确认" : `${items.length} ${unit}`, anchor),
    ],
    sections: [
      {
        id: anchor,
        title,
        content: items?.length ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
            {items.map((item) => (
              <li className="min-w-0" key={item.id}>
                <MemberCard item={item} tags={memberTags(item)} />
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

type RelatedEntry = Pick<CatalogEntrySummary, "id" | "name" | "image"> & {
  browsable?: boolean;
  note?: string;
};

export function CatalogRelations({ items }: { items: readonly RelatedEntry[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.id} className="max-w-full min-w-0">
          <GameplayRelationItem
            variant="inline"
            name={item.name}
            image={item.image}
            note={item.note}
            destination={item.browsable === false ? undefined : catalogEntryLocation(item)}
          />
        </li>
      ))}
    </ul>
  );
}

export function addRelationField(
  fields: DetailField[],
  label: string,
  anchor: string,
  items: readonly RelatedEntry[],
) {
  if (!items.length) return;
  fields.push({
    kind: "entries",
    label,
    anchor,
    value: items.map(catalogRelationEntry),
    moreLabel: `其他${label}`,
    fullWidth: items.length > 1,
  });
}

export function catalogRelationEntry(item: RelatedEntry): DetailEntry {
  return {
    key: item.id,
    name: item.name,
    image: item.image,
    note: item.note,
    destination: item.browsable === false ? undefined : catalogEntryLocation(item),
  };
}
