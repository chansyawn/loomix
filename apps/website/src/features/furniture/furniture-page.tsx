import {
  ArmchairIcon,
  ArrowDownUpIcon,
  LayersIcon,
  LayoutGridIcon,
  SearchIcon,
  TableIcon,
  XIcon,
} from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Button } from "@/ui/components/button";
import { Badge } from "@/ui/components/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import type { FurnitureData } from "./data";
import { FilterPanel } from "./filter-panel";
import { FurnitureVirtualGrid } from "./virtual-grid";
import { FurnitureTable } from "./furniture-table";
import { filterGroups, queryFurniture } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { FurnitureSearch, ViewQuery } from "./search";
import { FurnitureEmpty } from "./states";

type SearchUpdate = FurnitureSearch | ((previous: FurnitureSearch) => FurnitureSearch);

export function FurniturePage({
  data,
  search,
  onSearchChange,
}: {
  data: FurnitureData;
  search: FurnitureSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search[search.view];
  const section = useRef<HTMLElement>(null);
  const resultKey = JSON.stringify([search.view, search.layout, query]);
  const previousResultKey = useRef(resultKey);
  useLayoutEffect(() => {
    if (previousResultKey.current === resultKey) return;
    previousResultKey.current = resultKey;
    section.current
      ?.closest<HTMLDivElement>("[data-scroll-restoration-id]")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [resultKey]);
  const result = queryFurniture(data, search.view, query);
  const groups = filterGroups(data).filter(
    (group) => search.view === "items" || group.key === "qualities",
  );
  const update = (patch: Partial<ViewQuery>, replace = false) =>
    void onSearchChange((previous) => updateViewQuery(previous, patch), replace);
  const clear = () =>
    void onSearchChange((previous) => ({ ...previous, [previous.view]: emptyQuery() }));
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
  return (
    <section ref={section} className="@container">
      <div>
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight">家具</h1>
        </div>
        <Tabs
          value={search.view}
          onValueChange={(value) => {
            if (value === "items" || value === "sets")
              void onSearchChange((previous) => ({ ...previous, view: value }));
          }}
          className="gap-6"
        >
          <TabsList aria-label="家具视图">
            {(["items", "sets"] as const).map((view) => (
              <TabsTrigger key={view} value={view}>
                {view === "items" ? <ArmchairIcon /> : <LayersIcon />}
                {view === "items" ? "家具单件" : "家具套装"}
                <Badge variant="secondary">{data[view].length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {(["items", "sets"] as const).map((view) => (
            <TabsContent key={view} value={view}>
              {search.view === view && (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <InputGroup className="min-w-48 flex-1 sm:max-w-sm">
                      <InputGroupInput
                        aria-label={search.view === "items" ? "搜索家具名称" : "搜索套装名称"}
                        placeholder={search.view === "items" ? "搜索家具名称…" : "搜索套装名称…"}
                        value={query.q}
                        onChange={(event) => update({ q: event.target.value }, true)}
                      />
                      <InputGroupAddon>
                        <SearchIcon />
                      </InputGroupAddon>
                      {query.q && (
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            aria-label="清除搜索"
                            size="icon-xs"
                            onClick={() => update({ q: "" })}
                          >
                            <XIcon />
                          </InputGroupButton>
                        </InputGroupAddon>
                      )}
                    </InputGroup>
                    <FilterPanel
                      title="筛选家具"
                      groups={groups}
                      query={query}
                      total={result.total}
                      onFilter={(key, values) => update({ [key]: values })}
                      onClear={clear}
                    />
                    <Select
                      items={sortOptions}
                      value={query.sort}
                      onValueChange={(sort) => {
                        if (sort) update({ sort });
                      }}
                    >
                      <SelectTrigger aria-label="家具排序" className="ml-auto">
                        <ArrowDownUpIcon />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Object.entries(sortOptions).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <ToggleGroup
                      aria-label="家具展示方式"
                      variant="outline"
                      spacing={0}
                      value={[search.layout]}
                      onValueChange={([layout]) => {
                        if (layout === "grid" || layout === "table")
                          void onSearchChange((previous) => ({ ...previous, layout }));
                      }}
                    >
                      <ToggleGroupItem value="grid" aria-label="卡片视图">
                        <LayoutGridIcon />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="table" aria-label="表格视图">
                        <TableIcon />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="flex h-16 flex-nowrap items-center gap-2 overflow-x-auto">
                    <p
                      role="status"
                      className="mr-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground"
                    >
                      共{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {result.total}
                      </span>{" "}
                      {search.view === "items" ? "件家具" : "个套装"}
                    </p>
                    {chips.map((chip) => (
                      <Badge
                        key={chip.key}
                        variant="secondary"
                        className="h-auto max-w-full shrink-0 gap-1 pr-1"
                      >
                        <span className="truncate">{chip.label}</span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`移除${chip.label}`}
                          onClick={chip.remove}
                        >
                          <XIcon />
                        </Button>
                      </Badge>
                    ))}
                    {chips.length > 0 && (
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={clear}>
                        清空筛选
                      </Button>
                    )}
                  </div>
                  {result.total > 0 ? (
                    search.layout === "table" ? (
                      <FurnitureTable
                        resultKey={resultKey}
                        rows={result.rows}
                        view={search.view}
                        memberships={result.memberships}
                        sort={query.sort}
                        onSortChange={(sort) => update({ sort })}
                      />
                    ) : (
                      <FurnitureVirtualGrid
                        key={JSON.stringify([search.view, query])}
                        rows={result.rows}
                        view={search.view}
                      />
                    )
                  ) : (
                    <FurnitureEmpty onClear={clear} />
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
