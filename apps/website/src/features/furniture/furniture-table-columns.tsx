import { Link } from "@tanstack/react-router";
import type { FurnitureItem, FurnitureSet } from "../collection-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useFurnitureOrigin } from "./detail-navigation";
import { membershipIndex } from "./query";
import type { View } from "./search";

export type FurnitureRow = FurnitureItem | FurnitureSet;

function NameLink({ record, view }: { record: FurnitureRow; view: View }) {
  const origin = useFurnitureOrigin();
  return (
    <Link
      to={view === "items" ? "/collection/furniture/items/$id" : "/collection/furniture/sets/$id"}
      params={{ id: String(record.id) }}
      state={{ furnitureOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: FurnitureSet[]; complete: boolean }) {
  const origin = useFurnitureOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="套组"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collection/furniture/sets/$id"
          params={{ id: String(entry.id) }}
          state={{ furnitureOrigin: origin }}
          className={tableLinkClassName}
        >
          {entry.name}
        </Link>
      )}
    />
  );
}

export function furnitureTableColumns(
  view: View,
  groups: FurnitureSet[] = [],
): CollectionColumn<FurnitureRow>[] {
  const common = recordColumns<FurnitureRow>((record) => <NameLink record={record} view={view} />);
  if (view === "sets")
    return [
      ...common,
      textColumn("seriesName", "系列", 160, (record) =>
        "seriesName" in record ? record.seriesName : null,
      ),
      textColumn("members", "成员数量", 128, (record) =>
        "componentIds" in record && record.componentIds !== null
          ? `${record.componentIds.length} 件家具`
          : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const memberships = membershipIndex(groups);
  const complete = groups.every((entry) => entry.componentIds !== null);
  return [
    ...common,
    textColumn("category", "分类", 112, (record) =>
      "category" in record ? record.category : null,
    ),
    textColumn("type", "类型", 160, (record) => ("category" in record ? record.type : null)),
    textColumn("size", "尺寸", 112, (record) => ("category" in record ? record.size : null)),
    textColumn("colors", "颜色", 144, (record) => ("category" in record ? record.colors : null)),
    textColumn("materials", "材质", 144, (record) =>
      "category" in record ? record.materials : null,
    ),
    textColumn("sources", "获取途径", 240, (record) =>
      "category" in record ? record.sources : null,
    ),
    {
      id: "sets",
      header: "所属套组",
      width: 240,
      cell: (record) => (
        <MemberLinks groups={memberships.get(record.id) ?? []} complete={complete} />
      ),
    },
  ];
}
