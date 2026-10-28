import { Link } from "@tanstack/react-router";
import type { PlantItem, PlantSeries } from "../collection-view";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { usePlantsOrigin } from "./detail-navigation";
import { membershipIndex } from "./query";
import type { View } from "./search";
import { PlantSeedLinks } from "./seed-info";

export type PlantsRow = PlantItem | PlantSeries;

function NameLink({ record, view }: { record: PlantsRow; view: View }) {
  const origin = usePlantsOrigin();
  return (
    <Link
      to={view === "items" ? "/collection/plants/items/$id" : "/collection/plants/series/$id"}
      params={{ id: String(record.id) }}
      state={{ plantsOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: PlantSeries[]; complete: boolean }) {
  const origin = usePlantsOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="系列"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collection/plants/series/$id"
          params={{ id: String(entry.id) }}
          state={{ plantsOrigin: origin }}
          className={tableLinkClassName}
        >
          {entry.name}
        </Link>
      )}
    />
  );
}

export function plantsTableColumns(
  view: View,
  groups: PlantSeries[] = [],
): CollectionColumn<PlantsRow>[] {
  const common = recordColumns<PlantsRow>((record) => <NameLink record={record} view={view} />);
  const memberships = membershipIndex(groups);
  const facts: CollectionColumn<PlantsRow>[] = [
    textColumn("sources", "获取来源", 224, (record) => record.summary.sources.join("、") || null),
    textColumn(
      "flowerColors",
      "花色",
      168,
      (record) => record.summary.flowerColors.join("、") || null,
    ),
    {
      id: "seeds",
      header: "种子",
      width: 192,
      cell: (record) => (
        <PlantSeedLinks
          seeds={record.summary.seeds}
          seriesId={"plantIds" in record ? record.id : memberships.get(record.id)?.[0]?.id}
        />
      ),
    },
  ];
  if (view === "series")
    return [
      ...common,
      textColumn(
        "categories",
        "分类",
        144,
        (record) => record.summary.categories.join("、") || null,
      ),
      textColumn(
        "galaxies",
        "原产星系",
        160,
        (record) => record.summary.galaxies.join("、") || null,
      ),
      textColumn("harvestCounts", "收获茬数", 112, (record) =>
        record.summary.harvestCounts.length ? record.summary.harvestCounts.join(" / ") : null,
      ),
      ...facts,

      textColumn("members", "成员数量", 128, (record) =>
        "plantIds" in record && record.plantIds !== null
          ? `${record.plantIds.length} 种植物`
          : null,
      ),
      textColumn("description", "描述", 320, (record) => record.description),
    ];
  const complete = groups.every((entry) => entry.plantIds !== null);
  return [
    ...common,
    textColumn("category", "分类", 112, (record) =>
      "category" in record ? record.category : null,
    ),
    textColumn("originGalaxy", "原产星系", 160, (record) =>
      "category" in record ? record.originGalaxy : null,
    ),
    textColumn("maturityPeriod", "成熟周期", 144, (record) =>
      "category" in record ? record.maturityPeriod : null,
    ),
    textColumn("harvestCount", "收获茬数", 112, (record) =>
      "category" in record ? record.harvestCount : null,
    ),
    {
      id: "series",
      header: "所属系列",
      width: 240,
      cell: (record) => (
        <MemberLinks groups={memberships.get(record.id) ?? []} complete={complete} />
      ),
    },
    ...facts,
    textColumn("description", "描述", 320, (record) => record.description),
  ];
}
