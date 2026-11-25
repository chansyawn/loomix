import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { ClothingOutfit } from "../omnidex-view";
import {
  formatNeighborOutfitBodyTypes,
  formatNeighborOutfitPrice,
} from "../neighbor-outfit/presentation";
import { recordColumns, MembershipCell } from "../omnidex/table-columns";
import { textColumn, tableLinkClassName } from "../list-page/table-columns";
import type { ListColumn } from "../list-page/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { indexMembership } from "../omnidex/membership";
import type { View } from "./search";
import type { ClothingRow } from "./data";

function NameLink({ record }: { record: ClothingRow }) {
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

function MemberLinks({ groups, complete }: { groups: ClothingOutfit[]; complete: boolean }) {
  const origin = useOmnidexOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="套装"
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

export function clothingTableColumns(
  view: View,
  groups: ClothingOutfit[] = [],
): ListColumn<ClothingRow>[] {
  const common = recordColumns<ClothingRow>((record) => <NameLink record={record} />);
  if (view === "outfits")
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
  if (view === "neighborOutfit")
    return [
      ...common,
      textColumn("category", "部位", 112, (record) =>
        "category" in record ? record.category : null,
      ),
      textColumn("bodyTypes", "可用体型", 176, (record) =>
        "bodyTypes" in record ? formatNeighborOutfitBodyTypes(record.bodyTypes) : null,
      ),
      textColumn("price", "配置价格", 176, (record) =>
        "price" in record ? formatNeighborOutfitPrice(record.price) : null,
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
    {
      id: "outfits",
      header: "所属套装",
      width: 240,
      cell: (record) => (
        <MemberLinks groups={memberships.get(record.id) ?? []} complete={complete} />
      ),
    },
  ];
}
