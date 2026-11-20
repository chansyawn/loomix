import { Link } from "@tanstack/react-router";
import type { ClothingSet } from "../collection-view";
import {
  formatNeighborClothingBodyTypes,
  formatNeighborClothingPrice,
} from "../neighbor-clothing/presentation";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useCollectionOrigin } from "@/features/collection/navigation";
import { indexMembership } from "../collection/membership";
import type { View } from "./search";
import type { ClothingRow } from "./data";

function NameLink({ record }: { record: ClothingRow }) {
  const origin = useCollectionOrigin();
  return (
    <Link
      to="/collections/records/$id"
      params={{ id: String(record.id) }}
      state={{ collectionOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: ClothingSet[]; complete: boolean }) {
  const origin = useCollectionOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="套装"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collections/records/$id"
          params={{ id: String(entry.id) }}
          state={{ collectionOrigin: origin }}
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
  const common = recordColumns<ClothingRow>((record) => <NameLink record={record} />);
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
  if (view === "neighborClothing")
    return [
      ...common,
      textColumn("category", "部位", 112, (record) =>
        "category" in record ? record.category : null,
      ),
      textColumn("bodyTypes", "可用体型", 176, (record) =>
        "bodyTypes" in record ? formatNeighborClothingBodyTypes(record.bodyTypes) : null,
      ),
      textColumn("price", "配置价格", 176, (record) =>
        "price" in record ? formatNeighborClothingPrice(record.price) : null,
      ),
    ];
  const memberships = indexMembership(groups, (group) => group.componentIds);
  const complete = groups.every((entry) => entry.componentIds !== null);
  return [
    ...common,
    textColumn("category", "分类", 112, (record) => ("styles" in record ? record.category : null)),
    textColumn("colors", "颜色", 144, (record) => ("styles" in record ? record.colors : null)),
    textColumn("materials", "材质", 144, (record) =>
      "styles" in record ? record.materials : null,
    ),
    textColumn("styles", "风格", 144, (record) => ("styles" in record ? record.styles : null)),
    textColumn("acquisition", "获取途径", 240, (record) =>
      "styles" in record ? record.acquisition : null,
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
