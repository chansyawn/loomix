import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/ui/components/skeleton";
import { RecordImage } from "@/features/omnidex/record-image";
import { CatalogItemLink } from "@/features/omnidex/item-link";
import type { PlantItem, PlantSeries } from "../omnidex-view";
import type { PlantsData } from "./data";
import type { HarvestablePlant, PlantSeed } from "./model";
import { recordColumns, MembershipCell } from "../omnidex/table-columns";
import { textColumn, tableLinkClassName } from "../list-page/table-columns";
import type { ListColumn } from "../list-page/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { indexMembership } from "../omnidex/membership";
import { seedSeries } from "./model";
import type { View } from "./search";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { PlantSeedLinks, SeedNameLink } from "./seed-info";

export type PlantsRow = PlantItem | PlantSeries | PlantSeed | HarvestablePlant;

function isSeedRow(record: PlantsRow): record is PlantSeed {
  return "growth" in record;
}

function NameLink({ record }: { record: PlantsRow }) {
  const origin = useOmnidexOrigin();
  if (isSeedRow(record)) return <SeedNameLink seed={record} />;
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

function MemberLinks({ groups, complete }: { groups: PlantSeries[]; complete: boolean }) {
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

function SeedProductLinks({
  seed,
  itemRefs,
}: {
  seed: PlantSeed;
  itemRefs: PlantsData["itemRefs"] | undefined;
}) {
  const origin = useOmnidexOrigin();
  if (!itemRefs) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {seed.plantIds.map((id) => {
        const product = itemRefs.get(id);
        return product ? (
          <CatalogItemLink key={id} item={product} state={{ omnidexOrigin: origin }} />
        ) : (
          <span key={id} className="text-muted-foreground">
            未收录
          </span>
        );
      })}
    </div>
  );
}

function seedTableColumns(data?: Pick<PlantsData, "series" | "itemRefs">): ListColumn<PlantsRow>[] {
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
            <RecordImage image={record.image} name={record.name} inset="sm" fallback="icon" />
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
): ListColumn<PlantsRow>[] {
  if (view === "seeds") return seedTableColumns(data);
  const groups = data?.series ?? [];
  const common = recordColumns<PlantsRow>((record) => <NameLink record={record} />);
  if (view === "harvestablePlants")
    return [
      ...common,
      textColumn("category", "分类", 112, (row) =>
        "stockCategory" in row ? row.stockCategory : null,
      ),
      {
        id: "harvest",
        header: "可收获",
        width: 180,
        cell: (row) => ("harvest" in row ? <NameLink record={row.harvest} /> : null),
      },
    ];
  const memberships = indexMembership(groups, (group) => group.plantIds);
  const facts: ListColumn<PlantsRow>[] = [
    textColumn("flowerColors", "花色", 168, (record) =>
      "summary" in record ? record.summary.flowerColors.join("、") || null : null,
    ),
    {
      id: "seeds",
      header: "种子",
      width: 192,
      cell: (record) =>
        "summary" in record ? <PlantSeedLinks seeds={record.summary.seeds} /> : null,
    },
  ];
  if (view === "series")
    return [
      ...common,
      textColumn("categories", "分类", 144, (record) =>
        "summary" in record ? record.summary.categories.join("、") || null : null,
      ),
      textColumn("galaxies", "产区", 160, (record) =>
        "summary" in record ? record.summary.galaxies.join("、") || null : null,
      ),
      textColumn("harvestCounts", "收获茬数", 112, (record) =>
        "summary" in record && record.summary.harvestCounts.length
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
    textColumn("originGalaxy", "产区", 160, (record) =>
      "category" in record ? record.originGalaxy : null,
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
