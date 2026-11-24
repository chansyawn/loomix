import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { FurnitureItem, FurnitureSet } from "../omnidex-view";
import { recordColumns, MembershipCell } from "../omnidex/table-columns";
import { textColumn, tableLinkClassName } from "../list-page/table-columns";
import type { ListColumn } from "../list-page/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { indexMembership } from "../omnidex/membership";
import type { View } from "./search";

export type FurnitureRow = FurnitureItem | FurnitureSet;

function NameLink({ record }: { record: FurnitureRow }) {
  const origin = useOmnidexOrigin();
  return (
    <Link
      {...catalogEntryLocation(record)}
      state={{ omnidexOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: FurnitureSet[]; complete: boolean }) {
  const origin = useOmnidexOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="套组"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          {...catalogEntryLocation(entry)}
          state={{ omnidexOrigin: origin }}
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
): ListColumn<FurnitureRow>[] {
  const common = recordColumns<FurnitureRow>((record) => <NameLink record={record} />);
  if (view === "sets")
    return [
      ...common,
      textColumn("members", "成员数量", 128, (record) =>
        "componentIds" in record && record.componentIds !== null
          ? String(record.componentIds.length)
          : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const memberships = indexMembership(groups, (group) => group.componentIds);
  const complete = groups.every((entry) => entry.componentIds !== null);
  return [
    ...common,
    textColumn("category", "分类", 112, (record) =>
      "category" in record ? record.category : null,
    ),
    textColumn("type", "类型", 160, (record) =>
      "category" in record ? record.furnitureCategory : null,
    ),
    textColumn("size", "尺寸", 112, (record) => ("category" in record ? record.size : null)),
    textColumn("colors", "颜色", 144, (record) => ("category" in record ? record.colors : null)),
    textColumn("materials", "材质", 144, (record) =>
      "category" in record ? record.materials : null,
    ),
    textColumn("acquisition", "获取途径", 240, (record) =>
      "category" in record ? record.acquisition : null,
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
