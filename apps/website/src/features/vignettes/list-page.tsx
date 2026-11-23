import { Link } from "@tanstack/react-router";
import { ListCard } from "@/features/omnidex/list-card";
import { wideGrid } from "@/features/omnidex/grid-layout";
import { ListLayoutToggle } from "@/features/omnidex/layout-toggle";
import { ListPage } from "@/features/omnidex/page";
import { RecordImage } from "@/features/omnidex/record-image";
import { ListTable } from "@/features/omnidex/table";
import { textColumn, type ListColumn } from "@/features/omnidex/table-columns";
import { Empty, EmptyHeader, EmptyTitle } from "@/ui/components/empty";
import { SearchInput } from "@/ui/components/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import type { VignetteOrigin } from "./navigation";
import { filterVignettes, vignetteSearchSchema, type VignetteSearch } from "./search";
import { siteLabels, type VignetteSummary } from "./view";

const grid = wideGrid(80);

function VignetteLink({ entry, origin }: { entry: VignetteSummary; origin: VignetteOrigin }) {
  return (
    <Link
      to="/vignettes/$id"
      params={{ id: String(entry.id) }}
      state={{ vignetteOrigin: origin }}
      className="truncate rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-ring"
    >
      {entry.name}
    </Link>
  );
}

function columns(origin: VignetteOrigin): ListColumn<VignetteSummary>[] {
  return [
    {
      id: "name",
      header: "名称",
      width: 240,
      cell: (entry) => (
        <div className="flex min-w-0 items-center gap-2">
          <RecordImage
            image={entry.image}
            name=""
            inset="none"
            fallback="icon"
            className="aspect-2/1 w-12 shrink-0 rounded-md"
          />
          <VignetteLink entry={entry} origin={origin} />
        </div>
      ),
    },
    textColumn("size", "尺寸", 110, (entry) => entry.size),
    textColumn("stars", "星级", 80, (entry) => entry.stars),
    textColumn("terrain", "地形", 90, (entry) => entry.terrain),
  ];
}

export function VignetteListPage({
  entries,
  search,
  historyIndex,
  onChange,
}: {
  entries: VignetteSummary[];
  search: VignetteSearch;
  historyIndex: number;
  onChange: (patch: Partial<VignetteSearch>, replace?: boolean) => void;
}) {
  const visible = filterVignettes(entries, search);
  const origin = { search, index: historyIndex };

  return (
    <ListPage title="小栖地">
      <div className="flex flex-col gap-4 pb-8">
        <SearchInput
          className="w-full max-w-96"
          ariaLabel="搜索小栖地名称"
          placeholder="搜索小栖地名称或拼音…"
          value={search.q}
          onValueChange={(q, replace) => onChange({ q }, replace)}
        />
        <ToggleGroup
          aria-label="小栖地地形筛选"
          className="max-w-full flex-wrap"
          variant="outline"
          size="sm"
          value={[search.site ?? "all"]}
          onValueChange={([value]) => {
            if (value) onChange({ site: vignetteSearchSchema.shape.site.parse(value) });
          }}
        >
          <ToggleGroupItem value="all">全部地形</ToggleGroupItem>
          {Object.entries(siteLabels).map(([value, label]) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="text-xs text-muted-foreground">
            共 <span className="font-medium text-foreground tabular-nums">{visible.length}</span>{" "}
            处小栖地
          </p>
          <ListLayoutToggle
            title="小栖地"
            layout={search.layout}
            onLayoutChange={(layout) => onChange({ layout })}
          />
        </div>
        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{entries.length ? "未找到匹配的小栖地" : "暂无小栖地资料"}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : search.layout === "table" ? (
          <ListTable
            resultKey={JSON.stringify([search.site, search.q])}
            rows={visible}
            columns={columns(origin)}
            getRowId={(entry) => String(entry.id)}
            label="小栖地列表"
            sorting={[]}
            onSortingChange={() => {}}
          />
        ) : (
          <div className={grid.className}>
            {visible.map((entry) => (
              <ListCard
                key={entry.id}
                name={entry.name}
                quality={null}
                image={
                  <RecordImage
                    image={entry.image}
                    name={entry.name}
                    inset="none"
                    className="aspect-2/1"
                  />
                }
                titleLink={<VignetteLink entry={entry} origin={origin} />}
                tags={`${entry.size} · ${entry.stars} · ${entry.terrain}`}
              />
            ))}
          </div>
        )}
      </div>
    </ListPage>
  );
}
