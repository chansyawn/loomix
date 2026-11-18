import { Link } from "@tanstack/react-router";
import { CollectionCard } from "@/features/collection/collection-card";
import { wideGrid } from "@/features/collection/grid-layout";
import { CollectionLayoutToggle } from "@/features/collection/layout-toggle";
import { CollectionPage } from "@/features/collection/page";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionTable } from "@/features/collection/table";
import { textColumn, type CollectionColumn } from "@/features/collection/table-columns";
import { Empty, EmptyHeader, EmptyTitle } from "@/ui/components/empty";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { filterIslets, type StarseaSearch } from "./search";
import type { StarseaIslet, StarseaList } from "./view";

type Origin = { search: StarseaSearch; index: number };

const allRegions = "all";
const grid = wideGrid(80);

function regionNames(islet: StarseaIslet) {
  return islet.regions.map(({ name }) => name).join("、");
}

function IsletLink({
  islet,
  origin,
  className,
}: {
  islet: StarseaIslet;
  origin: Origin;
  className?: string;
}) {
  return (
    <Link
      to="/starsea/islets/$id"
      params={{ id: String(islet.id) }}
      state={{ starseaOrigin: origin }}
      className={className}
    >
      {islet.name}
    </Link>
  );
}

function IsletCard({ islet, origin }: { islet: StarseaIslet; origin: Origin }) {
  const region = regionNames(islet);
  return (
    <CollectionCard
      name={islet.name}
      quality={null}
      image={
        <RecordImage
          key={islet.image}
          image={islet.image}
          name={islet.name}
          fit={islet.illustrated ? "cover" : "contain"}
          inset={islet.illustrated ? "none" : "lg"}
          className="aspect-2/1"
        />
      }
      titleLink={<IsletLink islet={islet} origin={origin} />}
      tags={islet.encounterOnly ? `${region} · 邂逅候选` : region}
    />
  );
}

function isletColumns(origin: Origin): CollectionColumn<StarseaIslet>[] {
  return [
    {
      id: "name",
      header: "星屿",
      width: 210,
      cell: (islet) => (
        <div className="flex min-w-0 items-center gap-2">
          <RecordImage
            key={islet.image}
            image={islet.image}
            name=""
            fit={islet.illustrated ? "cover" : "contain"}
            inset="none"
            fallback="icon"
            className="aspect-2/1 w-12 shrink-0 rounded-md"
          />
          <IsletLink
            islet={islet}
            origin={origin}
            className="truncate rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-ring"
          />
        </div>
      ),
    },
    textColumn("region", "所属星海", 160, regionNames),
    textColumn("encounter", "备注", 96, (islet) => (islet.encounterOnly ? "邂逅候选" : "—")),
  ];
}

export function StarseaListPage({
  data,
  search,
  historyIndex,
  onChange,
}: {
  data: StarseaList;
  search: StarseaSearch;
  historyIndex: number;
  onChange: (search: StarseaSearch) => void;
}) {
  const visible = filterIslets(data.islets, search.region);
  const origin = { search, index: historyIndex };

  return (
    <CollectionPage title="星海">
      <div className="flex flex-col gap-4 pb-8">
        <ToggleGroup
          aria-label="星海区域筛选"
          className="max-w-full flex-wrap"
          variant="outline"
          size="sm"
          value={[search.region === null ? allRegions : String(search.region)]}
          onValueChange={([value]) => {
            if (typeof value === "string")
              onChange({ ...search, region: value === allRegions ? null : Number(value) });
          }}
        >
          <ToggleGroupItem value={allRegions}>全部星海</ToggleGroupItem>
          {data.regions.map((region) => (
            <ToggleGroupItem key={region.id} value={String(region.id)}>
              {region.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="text-xs text-muted-foreground">
            共 <span className="font-medium text-foreground tabular-nums">{visible.length}</span>{" "}
            座星屿
          </p>
          <CollectionLayoutToggle
            title="星海"
            layout={search.layout}
            onLayoutChange={(layout) => onChange({ ...search, layout })}
          />
        </div>
        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>暂无星屿资料</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : search.layout === "table" ? (
          <CollectionTable
            resultKey={String(search.region)}
            rows={visible}
            columns={isletColumns(origin)}
            getRowId={(row) => String(row.id)}
            label="星屿列表"
            sorting={[]}
            onSortingChange={() => {}}
          />
        ) : (
          <div className={grid.className}>
            {visible.map((islet) => (
              <IsletCard key={islet.id} islet={islet} origin={origin} />
            ))}
          </div>
        )}
      </div>
    </CollectionPage>
  );
}
