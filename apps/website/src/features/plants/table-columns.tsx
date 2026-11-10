import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/ui/components/skeleton";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionItemLink } from "@/features/collection/item-link";
import type { PlantItem, PlantSeries } from "../collection-view";
import type { PlantsData } from "./data";
import type { PlantSeed } from "./model";
import {
  recordColumns,
  textColumn,
  tableLinkClassName,
  MembershipCell,
} from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useCollectionOrigin } from "@/features/collection/navigation";
import { membershipIndex, seedSeries, seedSourceLabels } from "./query";
import type { View } from "./search";
import { collectionItemLocation } from "../collection/item-route";
import { PlantSeedLinks, SeedNameLink } from "./seed-info";

export type PlantsRow = PlantItem | PlantSeries | PlantSeed;

function isSeedRow(record: PlantsRow): record is PlantSeed {
  return "growthId" in record;
}

function NameLink({ record }: { record: PlantsRow }) {
  const origin = useCollectionOrigin();
  if (isSeedRow(record)) return <SeedNameLink seed={record} />;
  return (
    <Link
      {...("category" in record
        ? collectionItemLocation({ ...record, catalogCategory: "plants" })
        : {
            to: "/collections/records/$id" as const,
            params: { id: String(record.id) },
            search: { focus: undefined },
          })}
      state={{ collectionOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

function MemberLinks({ groups, complete }: { groups: PlantSeries[]; complete: boolean }) {
  const origin = useCollectionOrigin();
  return (
    <MembershipCell
      groups={groups}
      complete={complete}
      noun="系列"
      renderLink={(entry) => (
        <Link
          key={entry.id}
          to="/collections/records/$id"
          params={{ id: String(entry.id) }}
          search={{ focus: undefined }}
          state={{ collectionOrigin: origin }}
          className={tableLinkClassName}
        >
          {entry.name}
        </Link>
      )}
    />
  );
}

function SeedProductLinks({
  seed,
  itemRefs,
}: {
  seed: PlantSeed;
  itemRefs: PlantsData["itemRefs"] | undefined;
}) {
  const origin = useCollectionOrigin();
  if (!itemRefs) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {seed.plantIds.map((id) => {
        const product = itemRefs.get(id);
        return product ? (
          <CollectionItemLink key={id} item={product} state={{ collectionOrigin: origin }} />
        ) : (
          <span key={id} className="text-muted-foreground">
            未收录
          </span>
        );
      })}
    </div>
  );
}

function seedTableColumns(
  data?: Pick<PlantsData, "series" | "itemRefs">,
): CollectionColumn<PlantsRow>[] {
  const groups = data?.series ?? [];
  const complete = groups.every((group) => group.plantIds !== null);
  return [
    {
      id: "name",
      header: "名称",
      width: 240,
      sortable: true,
      value: (record) => record.name,
      cell: (record) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 shrink-0 overflow-hidden rounded-md" aria-hidden="true">
            <RecordImage image={record.image} name={record.name} compact />
          </div>
          <NameLink record={record} />
        </div>
      ),
      skeleton: (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
      ),
    },
    {
      id: "series",
      header: "所属系列",
      width: 200,
      cell: (record) =>
        isSeedRow(record) ? (
          <MemberLinks groups={seedSeries(record, groups)} complete={complete} />
        ) : null,
    },
    {
      id: "acquisition",
      header: "获取来源",
      width: 224,
      cell: (record) => {
        if (!isSeedRow(record)) return null;
        const acquisition = seedSourceLabels(record);
        return acquisition.length > 0 ? (
          <span className="block truncate" title={acquisition.join("、")}>
            {acquisition.join("、")}
          </span>
        ) : (
          <span className="text-muted-foreground">未提供</span>
        );
      },
    },
    textColumn("harvestCount", "收获茬数", 112, (record) =>
      isSeedRow(record) &&
      (record.growth.kind === "crop" ? record.growth.harvestCount : null) !== null
        ? `${record.growth.kind === "crop" ? record.growth.harvestCount : null} 茬`
        : null,
    ),
    {
      id: "products",
      header: "关联植物",
      width: 360,
      cell: (record) =>
        isSeedRow(record) ? <SeedProductLinks seed={record} itemRefs={data?.itemRefs} /> : null,
    },
    textColumn("description", "描述", 320, (record) => record.description),
  ];
}

export function plantsTableColumns(
  view: View,
  data?: Pick<PlantsData, "series" | "itemRefs">,
): CollectionColumn<PlantsRow>[] {
  if (view === "seeds") return seedTableColumns(data);
  const groups = data?.series ?? [];
  const common = recordColumns<PlantsRow>((record) => <NameLink record={record} />);
  const memberships = membershipIndex(groups);
  const facts: CollectionColumn<PlantsRow>[] = [
    textColumn("acquisition", "获取来源", 224, (record) =>
      isSeedRow(record) ? null : record.summary.acquisition.join("、") || null,
    ),
    textColumn("flowerColors", "花色", 168, (record) =>
      isSeedRow(record) ? null : record.summary.flowerColors.join("、") || null,
    ),
    {
      id: "seeds",
      header: "种子",
      width: 192,
      cell: (record) =>
        isSeedRow(record) ? null : <PlantSeedLinks seeds={record.summary.seeds} />,
    },
  ];
  if (view === "series")
    return [
      ...common,
      textColumn("categories", "分类", 144, (record) =>
        isSeedRow(record) ? null : record.summary.categories.join("、") || null,
      ),
      textColumn("galaxies", "原产星系", 160, (record) =>
        isSeedRow(record) ? null : record.summary.galaxies.join("、") || null,
      ),
      textColumn("harvestCounts", "收获茬数", 112, (record) =>
        !isSeedRow(record) && record.summary.harvestCounts.length
          ? record.summary.harvestCounts.join(" / ")
          : null,
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
