import { Link } from "@tanstack/react-router";
import type { CreatureItem, CreatureSeries } from "../collection-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useCreaturesOrigin } from "./detail-navigation";
import { membershipIndex } from "./query";
import type { View } from "./search";

export type CreaturesRow = CreatureItem | CreatureSeries;

function NameLink({ record, view }: { record: CreaturesRow; view: View }) {
  const origin = useCreaturesOrigin();
  return (
    <Link
      to={view === "items" ? "/collection/creatures/items/$id" : "/collection/creatures/series/$id"}
      params={{ id: String(record.id) }}
      state={{ creaturesOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: CreatureSeries[]; complete: boolean }) {
  const origin = useCreaturesOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="系列"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collection/creatures/series/$id"
          params={{ id: String(entry.id) }}
          state={{ creaturesOrigin: origin }}
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
): CollectionColumn<CreaturesRow>[] {
  const common = recordColumns<CreaturesRow>((record) => <NameLink record={record} view={view} />);
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
  const memberships = membershipIndex(groups);
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
