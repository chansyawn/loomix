import { ArmchairIcon, ArrowDownUpIcon, LayersIcon, SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import type { FurnitureData } from "./data";
import { FilterPanel } from "./filter-panel";
import { FurnitureCard, FurnitureSetCard } from "./furniture-card";
import { FurniturePagination } from "./pagination";
import {
  categories,
  emptyQuery,
  filterGroups,
  queryFurniture,
  sortOptions,
  updateViewQuery,
} from "./query";
import type { FurnitureSearch, Sort, View, ViewQuery } from "./query";
import { FurnitureEmpty } from "./states";
import "./furniture.css";

type SearchUpdate = FurnitureSearch | ((previous: FurnitureSearch) => FurnitureSearch);

export function FurniturePage({
  data,
  search,
  onSearchChange,
}: {
  data: FurnitureData;
  search: FurnitureSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => void;
}) {
  const top = useRef<HTMLDivElement>(null);
  const query = search[search.view];
  const result = queryFurniture(data, search.view, query);
  const groups = filterGroups(data, query.category).filter(
    (group) => search.view === "items" || group.key === "qualities",
  );
  const update = (patch: Partial<ViewQuery>, replace = false) =>
    onSearchChange((previous) => updateViewQuery(previous, patch), replace);
  const clear = () =>
    onSearchChange((previous) => ({ ...previous, [previous.view]: emptyQuery() }));
  const chips = groups.flatMap((group) =>
    query[group.key].map((value) => ({
      key: `${group.key}-${value}`,
      label: `${group.label}：${group.options.find((option) => option.value === value)?.label ?? value}`,
      remove: () =>
        update({ [group.key]: query[group.key].filter((selected) => selected !== value) }),
    })),
  );
  if (query.q)
    chips.unshift({ key: "q", label: `搜索：${query.q}`, remove: () => update({ q: "" }) });
  if (query.category)
    chips.unshift({
      key: "category",
      label: `分类：${query.category}`,
      remove: () => update({ category: "" }),
    });

  function changeCategory(category: string) {
    const validTypes =
      filterGroups(data, category)
        .find((group) => group.key === "types")
        ?.options.map((option) => option.value) ?? [];
    update({ category, types: query.types.filter((type) => validTypes.includes(type)) });
  }

  return (
    <section className="furniture-page pb-6 pt-5 sm:pt-8">
      <div ref={top} className="scroll-mt-4">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">家具</h1>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
                {data[search.view].length}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              从一件心仪的家具，开始布置理想生活。
            </p>
          </div>
          <ArmchairIcon
            className="mt-1 hidden size-9 text-amber-500/60 sm:block"
            strokeWidth={1.3}
          />
        </div>
        <div className="mb-6 flex gap-6 border-b" aria-label="家具视图">
          {(["items", "sets"] as const).map((view: View) => (
            <button
              key={view}
              type="button"
              aria-pressed={search.view === view}
              onClick={() => onSearchChange((previous) => ({ ...previous, view }))}
              className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium outline-offset-4 ${search.view === view ? "border-amber-400 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {view === "items" ? (
                <ArmchairIcon className="size-4" />
              ) : (
                <LayersIcon className="size-4" />
              )}
              {view === "items" ? "家具单件" : "家具套装"}
              <span className="text-xs tabular-nums text-muted-foreground">
                {data[view].length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-48 flex-1 sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="搜索家具名称"
              placeholder={search.view === "items" ? "搜索家具名称…" : "搜索套装名称…"}
              value={query.q}
              onChange={(event) => update({ q: event.target.value }, true)}
              className="h-10 rounded-lg border-border/70 bg-background pl-9 pr-9"
            />
            {query.q && (
              <button
                type="button"
                aria-label="清除搜索"
                onClick={() => update({ q: "" })}
                className="absolute right-2 top-2 rounded p-1 text-muted-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          <FilterPanel
            groups={groups}
            query={query}
            total={result.total}
            onFilter={(key, values) => update({ [key]: values })}
            onClear={clear}
          />
          <div className="relative ml-auto">
            <ArrowDownUpIcon className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <select
              aria-label="家具排序"
              value={query.sort}
              onChange={(event) => update({ sort: event.target.value as Sort })}
              className="h-10 max-w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-sm outline-offset-4"
            >
              {Object.entries(sortOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {search.view === "items" && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="家具分类">
            {["", ...categories].map((category) => (
              <Button
                key={category}
                size="sm"
                variant={query.category === category ? "default" : "ghost"}
                aria-pressed={query.category === category}
                onClick={() => changeCategory(category)}
                className="shrink-0 text-xs"
              >
                {category || "全部"}
              </Button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 py-5">
          <p role="status" className="mr-2 text-xs text-muted-foreground">
            共 <span className="font-medium tabular-nums text-foreground">{result.total}</span>{" "}
            {search.view === "items" ? "件家具" : "个套装"}
          </p>
          {chips.map((chip) => (
            <button
              type="button"
              key={chip.key}
              aria-label={`移除${chip.label}`}
              onClick={chip.remove}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">{chip.label}</span>
              <XIcon className="size-3 shrink-0" />
            </button>
          ))}
          {chips.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              清空筛选
            </button>
          )}
        </div>
      </div>
      {result.total > 0 ? (
        <>
          <div
            className={`${search.view === "items" ? "furniture-grid" : "furniture-set-grid"} mb-8`}
          >
            {result.rows.map((row) =>
              "category" in row ? (
                <FurnitureCard
                  key={row.id}
                  item={row}
                  sets={result.memberships.get(row.id) ?? []}
                />
              ) : (
                <FurnitureSetCard key={row.id} set={row} />
              ),
            )}
          </div>
          <FurniturePagination
            page={result.page}
            pages={result.pages}
            onChange={(page) => {
              update({ page });
              top.current?.scrollIntoView({ block: "start" });
            }}
          />
        </>
      ) : (
        <FurnitureEmpty onClear={clear} />
      )}
    </section>
  );
}
