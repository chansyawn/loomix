import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { DishItem, DishSeries } from "../omnidex-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../omnidex/table-columns";
import type { ListColumn } from "../omnidex/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { indexMembership } from "../omnidex/membership";
import { unlockConditionLabel, effectSummary, formatTastes } from "./presentation";
import type { DishView as View } from "./search";

export type DishesRow = DishItem | DishSeries;

function NameLink({ record }: { record: DishesRow }) {
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

function MemberLinks({ groups, complete }: { groups: DishSeries[]; complete: boolean }) {
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

export function dishesTableColumns(view: View, groups: DishSeries[] = []): ListColumn<DishesRow>[] {
  const common = recordColumns<DishesRow>((record) => <NameLink record={record} />);
  if (view === "series")
    return [
      ...common,

      textColumn("members", "成员数量", 128, (record) =>
        "dishIds" in record && record.dishIds !== null ? `${record.dishIds.length} 道菜肴` : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const memberships = indexMembership(groups, (group) => group.dishIds);
  const complete = groups.every((entry) => entry.dishIds !== null);
  return [
    ...common,
    textColumn("difficulty", "难度", 112, (record) =>
      "difficulty" in record ? record.difficulty : null,
    ),
    textColumn("tastes", "口味", 112, (record) =>
      "difficulty" in record ? formatTastes(record.tastes) : null,
    ),
    textColumn("galaxyFlavor", "星系风味", 160, (record) =>
      "difficulty" in record ? record.galaxyFlavor : null,
    ),
    textColumn("cookware", "炊具", 160, (record) =>
      "difficulty" in record ? record.cookware : null,
    ),
    textColumn("unlockCondition", "解锁条件", 240, (record) =>
      "difficulty" in record ? unlockConditionLabel(record.unlockCondition) : null,
    ),
    textColumn("effects", "效果", 320, (record) =>
      "difficulty" in record ? effectSummary(record) : null,
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
