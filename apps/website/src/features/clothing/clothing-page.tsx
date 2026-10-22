import type { ClothingItem } from "@loomix/content-schema";
import {
  ShirtIcon,
  SparklesIcon,
  ArrowDownUpIcon,
  LayersIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
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
import type { ClothingData } from "./data";
import { FilterPanel } from "@/ui/collection/filter-panel";
import { ClothingCard } from "./clothing-card";
import { ClothingVirtualGrid } from "./virtual-grid";
import { filterGroups, queryClothing } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { ClothingSearch, ViewQuery } from "./search";
import { ClothingEmpty } from "./states";

type SearchUpdate = ClothingSearch | ((previous: ClothingSearch) => ClothingSearch);

export function ClothingPage({
  data,
  search,
  onSearchChange,
}: {
  data: ClothingData;
  search: ClothingSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search[search.view];
  const result = queryClothing(data, search.view, query);
  const groups = filterGroups(data, search.view);
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
    <section className="@container">
      <div>
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight">服饰</h1>
        </div>
        <Tabs
          value={search.view}
          onValueChange={(value) => {
            if (value === "items" || value === "sets" || value === "appearances")
              void onSearchChange((previous) => ({ ...previous, view: value }));
          }}
          className="gap-6"
        >
          <TabsList aria-label="服饰视图" className="w-full max-w-sm">
            {(["items", "sets", "appearances"] as const).map((view) => (
              <TabsTrigger
                key={view}
                value={view}
                className="min-w-0 gap-1 px-2 [&_svg]:hidden @min-[380px]:gap-2 @min-[380px]:px-3 @min-[380px]:[&_svg]:block"
              >
                {view === "items" ? (
                  <ShirtIcon />
                ) : view === "sets" ? (
                  <LayersIcon />
                ) : (
                  <SparklesIcon />
                )}
                {view === "items" ? "服装" : view === "sets" ? "套装" : "外观"}
                <Badge variant="secondary">{data[view].length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {(["items", "sets", "appearances"] as const).map((view) => (
            <TabsContent key={view} value={view}>
              {search.view === view && (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <InputGroup className="min-w-48 flex-1 sm:max-w-sm">
                      <InputGroupInput
                        aria-label={
                          search.view === "items"
                            ? "搜索服装名称"
                            : search.view === "sets"
                              ? "搜索套装名称"
                              : "搜索外观名称"
                        }
                        placeholder={
                          search.view === "items"
                            ? "搜索服装名称…"
                            : search.view === "sets"
                              ? "搜索套装名称…"
                              : "搜索外观名称…"
                        }
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
                      title="筛选服饰"
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
                      <SelectTrigger aria-label="服饰排序" className="ml-auto">
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
                      {search.view === "items"
                        ? "件服装"
                        : search.view === "sets"
                          ? "个套装"
                          : "项外观"}
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
                    search.view === "items" ? (
                      <ClothingVirtualGrid
                        key={JSON.stringify([search.view, query])}
                        rows={result.rows.filter((row): row is ClothingItem => "styles" in row)}
                      />
                    ) : (
                      <div
                        className={
                          search.view === "sets"
                            ? "grid grid-cols-1 gap-4 pb-8 @min-[420px]:grid-cols-2 @min-[740px]:grid-cols-3 @min-[1040px]:grid-cols-4"
                            : "grid grid-cols-2 gap-4 pb-8 @min-[540px]:grid-cols-3 @min-[740px]:grid-cols-4 @min-[940px]:grid-cols-5"
                        }
                      >
                        {result.rows.map((record) => (
                          <ClothingCard key={record.id} record={record} />
                        ))}
                      </div>
                    )
                  ) : (
                    <ClothingEmpty onClear={clear} />
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
