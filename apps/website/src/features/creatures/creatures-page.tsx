import { BugIcon, ArrowDownUpIcon, LayersIcon, SearchIcon, XIcon } from "lucide-react";
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
import type { CreaturesData } from "./data";
import { FilterSummary } from "@/ui/collection/filter-summary";
import { FilterPanel } from "@/ui/collection/filter-panel";
import { CreaturesVirtualGrid } from "./virtual-grid";
import { filterGroups, queryCreatures } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { CreaturesSearch, ViewQuery } from "./search";
import { CreaturesEmpty } from "./states";

type SearchUpdate = CreaturesSearch | ((previous: CreaturesSearch) => CreaturesSearch);

export function CreaturesPage({
  data,
  search,
  onSearchChange,
}: {
  data: CreaturesData;
  search: CreaturesSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search[search.view];
  const result = queryCreatures(data, search.view, query);
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
    <section className="@container">
      <div>
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight">生物</h1>
        </div>
        <Tabs
          value={search.view}
          onValueChange={(value) => {
            if (value === "items" || value === "series")
              void onSearchChange((previous) => ({ ...previous, view: value }));
          }}
          className="gap-6"
        >
          <TabsList aria-label="生物视图">
            {(["items", "series"] as const).map((view) => (
              <TabsTrigger key={view} value={view}>
                {view === "items" ? <BugIcon /> : <LayersIcon />}
                {view === "items" ? "生物" : "生物系列"}
                <Badge variant="secondary">{data[view].length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {(["items", "series"] as const).map((view) => (
            <TabsContent key={view} value={view}>
              {search.view === view && (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <InputGroup className="min-w-48 flex-1 sm:max-w-sm">
                      <InputGroupInput
                        aria-label={search.view === "items" ? "搜索生物名称" : "搜索系列名称"}
                        placeholder={search.view === "items" ? "搜索生物名称…" : "搜索系列名称…"}
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
                      title={search.view === "items" ? "筛选生物" : "筛选生物系列"}
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
                      <SelectTrigger aria-label="生物排序" className="ml-auto">
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
                  <FilterSummary
                    status={
                      <p role="status" className="whitespace-nowrap text-xs text-muted-foreground">
                        共{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {result.total}
                        </span>{" "}
                        {search.view === "items" ? "种生物" : "个系列"}
                      </p>
                    }
                    chips={chips.map((chip) => (
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
                    onClear={clear}
                  />
                  {result.total > 0 ? (
                    <CreaturesVirtualGrid
                      data={data}
                      key={JSON.stringify([search.view, query])}
                      rows={result.rows}
                      view={search.view}
                    />
                  ) : (
                    <CreaturesEmpty onClear={clear} view={search.view} />
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
