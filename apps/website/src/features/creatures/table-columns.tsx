import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { CreatureItem, CreatureSeries } from "../omnidex-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../omnidex/table-columns";
import type { ListColumn } from "../omnidex/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { indexMembership } from "../omnidex/membership";
import type { View } from "./search";

export type CreaturesRow = CreatureItem | CreatureSeries;

function NameLink({ record }: { record: CreaturesRow }) {
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

function MemberLinks({ groups, complete }: { groups: CreatureSeries[]; complete: boolean }) {
  const origin = useOmnidexOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="系列"
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

export function creaturesTableColumns(
  view: View,
  groups: CreatureSeries[] = [],
): ListColumn<CreaturesRow>[] {
  const common = recordColumns<CreaturesRow>((record) => <NameLink record={record} />);
  if (view === "series")
    return [
      ...common,

      textColumn("members", "成员数量", 128, (record) =>
        "creatureIds" in record && record.creatureIds !== null
          ? `${record.creatureIds.length} 种生物`
          : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const memberships = indexMembership(groups, (group) => group.creatureIds);
  const complete = groups.every((entry) => entry.creatureIds !== null);
  return [
    ...common,
    textColumn("category", "分类", 112, (record) =>
      "category" in record ? record.category : null,
    ),
    textColumn("region", "地区", 160, (record) => ("category" in record ? record.region : null)),
    textColumn("habitat", "栖息地", 160, (record) =>
      "category" in record ? record.habitat : null,
    ),
    textColumn("activeSeasons", "出没季节", 144, (record) =>
      "category" in record ? record.activeSeasons : null,
    ),
    textColumn("activeTimes", "出没时段", 144, (record) =>
      "category" in record ? record.activeTimes : null,
    ),
    textColumn("activeWeather", "出没天气", 144, (record) =>
      "category" in record ? record.activeWeather : null,
    ),
    textColumn("sizeRange", "体型范围", 144, (record) =>
      "category" in record ? record.sizeRange : null,
    ),
    {
      id: "series",
      header: "所属系列",
      width: 240,
      cell: (record) => (
        <MemberLinks groups={memberships.get(record.id) ?? []} complete={complete} />
      ),
    },
  ];
}
