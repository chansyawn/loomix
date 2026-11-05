import type { ReactNode } from "react";
import { Button } from "@/ui/components/button";
import { SearchInput } from "@/ui/components/search-input";
import { Skeleton } from "@/ui/components/skeleton";
import { galaxies, type NeighborsSearch } from "./search";

export function NeighborsListLayout({
  search,
  total,
  loading = false,
  onQueryChange,
  onGalaxyChange,
  onClear,
  children,
}: {
  search: NeighborsSearch;
  total: number;
  loading?: boolean;
  onQueryChange?: (query: string, replace: boolean) => void;
  onGalaxyChange?: (galaxy: NeighborsSearch["galaxy"]) => void;
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className="@container pb-8"
      aria-busy={loading || undefined}
      aria-label={loading ? "正在加载友邻资料" : undefined}
    >
      <div className="mb-4">
        <h1 className="text-3xl font-semibold tracking-tight">友邻</h1>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            className="min-w-48 flex-1 sm:max-w-sm"
            ariaLabel="搜索友邻或星球"
            placeholder="搜索友邻或星球…"
            value={search.q}
            onValueChange={onQueryChange}
            disabled={loading}
          />
        </div>
        <div role="group" aria-label="星系筛选" className="flex flex-wrap gap-2">
          {(["", ...galaxies] as const).map((galaxy) => (
            <Button
              key={galaxy}
              variant={search.galaxy === galaxy ? "default" : "outline"}
              size="sm"
              aria-pressed={search.galaxy === galaxy}
              disabled={loading}
              onClick={() => onGalaxyChange?.(galaxy)}
            >
              {galaxy || "全部星系"}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex h-16 items-center justify-between gap-2">
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <p role="status" className="text-xs whitespace-nowrap text-muted-foreground">
            共 <span className="font-medium text-foreground tabular-nums">{total}</span> 位友邻
          </p>
        )}
        {!loading && (search.q || search.galaxy) && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            清空筛选
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

export function NeighborsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
