import { SearchIcon } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import type { NeighborsData } from "./data";
import { NeighborCard } from "./neighbor-card";
import { galaxies, queryNeighbors, type NeighborsSearch } from "./search";

type SearchUpdate = NeighborsSearch | ((previous: NeighborsSearch) => NeighborsSearch);
export function NeighborsPage({
  data,
  search,
  onSearchChange,
}: {
  data: NeighborsData;
  search: NeighborsSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const results = queryNeighbors(data, search);
  const update = (patch: Partial<NeighborsSearch>, replace = false) =>
    void onSearchChange((previous) => ({ ...previous, ...patch }), replace);
  const clear = () => void onSearchChange({ q: "", galaxy: "" });
  return (
    <section className="space-y-7 pb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">友邻</h1>
        <Badge variant="secondary">{data.neighbors.length} 位</Badge>
      </div>
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <SearchIcon
            aria-hidden="true"
            className="absolute top-3 left-3 size-4 text-muted-foreground"
          />
          <Input
            className="pl-9"
            aria-label="搜索友邻或星球"
            placeholder="搜索友邻或星球…"
            value={search.q}
            onChange={(event) => update({ q: event.target.value }, true)}
          />
        </div>
        <div role="group" aria-label="星系筛选" className="flex flex-wrap gap-2">
          {(["", ...galaxies] as const).map((galaxy) => (
            <Button
              key={galaxy}
              variant={search.galaxy === galaxy ? "default" : "outline"}
              size="sm"
              aria-pressed={search.galaxy === galaxy}
              onClick={() => update({ galaxy })}
            >
              {galaxy || "全部星系"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span role="status">找到 {results.length} 位友邻</span>
          {(search.q || search.galaxy) && (
            <Button variant="ghost" size="sm" onClick={clear}>
              清空筛选
            </Button>
          )}
        </div>
      </div>
      {results.length ? (
        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {results.map((neighbor) => (
            <NeighborCard key={neighbor.id} neighbor={neighbor} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed px-4 py-20 text-center">
          <h2 className="font-semibold">没有找到匹配的友邻</h2>
          <p className="my-3 text-sm text-muted-foreground">试试其他关键词，或清空筛选条件。</p>
          <Button variant="outline" onClick={clear}>
            清空筛选
          </Button>
        </div>
      )}
    </section>
  );
}
