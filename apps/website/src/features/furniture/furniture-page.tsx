import { ArmchairIcon, ArrowDownUpIcon, LayersIcon, SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";
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
import type { FurnitureData } from "./data";
import { FilterPanel } from "./filter-panel";
import { FurnitureCard, FurnitureSetCard } from "./furniture-card";
import { FurniturePagination } from "./pagination";
import { emptyQuery, filterGroups, queryFurniture, sortOptions, updateViewQuery } from "./query";
import type { FurnitureSearch, ViewQuery } from "./query";
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
  const groups = filterGroups(data).filter(
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
  return (
    <section className="furniture-page pb-6 pt-5 sm:pt-8">
      <div ref={top} className="scroll-mt-4">
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight">家具</h1>
        </div>
        <Tabs
          value={search.view}
          onValueChange={(value) => {
            if (value === "items" || value === "sets")
              onSearchChange((previous) => ({ ...previous, view: value }));
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
                    <>
                      <div
                        className={`${search.view === "items" ? "furniture-grid" : "furniture-set-grid"} mb-8`}
                      >
                        {result.rows.map((row) =>
                          "category" in row ? (
                            <FurnitureCard key={row.id} item={row} />
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
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
