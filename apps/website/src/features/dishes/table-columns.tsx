import { Link } from "@tanstack/react-router";
import type { DishItem, DishSeries } from "../collection-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useDishesOrigin } from "./detail-navigation";
import { membershipIndex } from "./query";
import type { View } from "./search";

export type DishesRow = DishItem | DishSeries;

function NameLink({ record, view }: { record: DishesRow; view: View }) {
  const origin = useDishesOrigin();
  return (
    <Link
      to={view === "items" ? "/collection/dishes/items/$id" : "/collection/dishes/series/$id"}
      params={{ id: String(record.id) }}
      state={{ dishesOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: DishSeries[]; complete: boolean }) {
  const origin = useDishesOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="系列"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collection/dishes/series/$id"
          params={{ id: String(entry.id) }}
          state={{ dishesOrigin: origin }}
          className={tableLinkClassName}
        >
          {entry.name}
        </Link>
      )}
    />
  );
}

export function dishesTableColumns(
  view: View,
  groups: DishSeries[] = [],
): CollectionColumn<DishesRow>[] {
  const common = recordColumns<DishesRow>((record) => <NameLink record={record} view={view} />);
  if (view === "series")
    return [
      ...common,

      textColumn("members", "成员数量", 128, (record) =>
        "dishIds" in record && record.dishIds !== null ? `${record.dishIds.length} 道菜肴` : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const memberships = membershipIndex(groups);
  const complete = groups.every((entry) => entry.dishIds !== null);
  return [
    ...common,
    textColumn("difficulty", "难度", 112, (record) =>
      "difficulty" in record ? record.difficulty : null,
    ),
    textColumn("galaxyFlavor", "星系风味", 160, (record) =>
      "difficulty" in record ? record.galaxyFlavor : null,
    ),
    textColumn("cookware", "炊具", 160, (record) =>
      "difficulty" in record ? record.cookware : null,
    ),
    textColumn("effects", "效果", 320, (record) =>
      "difficulty" in record ? record.effects : null,
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
