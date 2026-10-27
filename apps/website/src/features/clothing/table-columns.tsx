import { Link } from "@tanstack/react-router";
import type { ClothingItem, ClothingSet, ClothingAppearance } from "../collection-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useClothingOrigin } from "./detail-navigation";
import { membershipIndex } from "./query";
import type { View } from "./search";

export type ClothingRow = ClothingItem | ClothingSet | ClothingAppearance;

function NameLink({ record, view }: { record: ClothingRow; view: View }) {
  const origin = useClothingOrigin();
  return (
    <Link
      to={
        view === "items"
          ? "/collection/clothing/items/$id"
          : view === "sets"
            ? "/collection/clothing/sets/$id"
            : "/collection/clothing/appearances/$id"
      }
      params={{ id: String(record.id) }}
      state={{ clothingOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: ClothingSet[]; complete: boolean }) {
  const origin = useClothingOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="套装"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collection/clothing/sets/$id"
          params={{ id: String(entry.id) }}
          state={{ clothingOrigin: origin }}
          className={tableLinkClassName}
        >
          {entry.name}
        </Link>
      )}
    />
  );
}

export function clothingTableColumns(
  view: View,
  groups: ClothingSet[] = [],
): CollectionColumn<ClothingRow>[] {
  const common = recordColumns<ClothingRow>((record) => <NameLink record={record} view={view} />);
  if (view === "sets")
    return [
      ...common,

      textColumn("members", "成员数量", 128, (record) =>
        "componentIds" in record && record.componentIds !== null
          ? `${record.componentIds.length} 件服装`
          : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  if (view === "appearances")
    return [
      ...common,
      textColumn("category", "分类", 112, (record) =>
        "category" in record ? record.category : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const memberships = membershipIndex(groups);
  const complete = groups.every((entry) => entry.componentIds !== null);
  return [
    ...common,
    textColumn("category", "分类", 112, (record) => ("styles" in record ? record.category : null)),
    textColumn("colors", "颜色", 144, (record) => ("styles" in record ? record.colors : null)),
    textColumn("materials", "材质", 144, (record) =>
      "styles" in record ? record.materials : null,
    ),
    textColumn("styles", "风格", 144, (record) => ("styles" in record ? record.styles : null)),
    textColumn("sources", "获取途径", 240, (record) =>
      "styles" in record ? record.sources : null,
    ),
    {
      id: "sets",
      header: "所属套装",
      width: 240,
      cell: (record) => (
        <MemberLinks groups={memberships.get(record.id) ?? []} complete={complete} />
      ),
    },
  ];
}
