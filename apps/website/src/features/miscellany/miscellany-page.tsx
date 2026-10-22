import { ArrowDownUpIcon, SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
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
import type { MiscellanyData } from "./data";
import { FilterPanel } from "@/ui/collection/filter-panel";
import { MiscellanyCard } from "./miscellany-card";
import { filterGroups, queryMiscellany } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { MiscellanyQuery, MiscellanySearch } from "./search";
import { MiscellanyEmpty } from "./states";

type SearchUpdate = MiscellanySearch | ((previous: MiscellanySearch) => MiscellanySearch);

export function MiscellanyPage({
  data,
  search,
  onSearchChange,
}: {
  data: MiscellanyData;
  search: MiscellanySearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search.items;
  const result = queryMiscellany(data, query);
  const groups = filterGroups(data);
  const update = (patch: Partial<MiscellanyQuery>, replace = false) =>
    void onSearchChange(
      (previous) => ({ ...previous, items: { ...previous.items, ...patch } }),
      replace,
    );
  const clear = () => void onSearchChange((previous) => ({ ...previous, items: emptyQuery() }));
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
      <div className="mb-7">
        <h1 className="text-3xl font-semibold">杂物</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="min-w-48 flex-1 sm:max-w-sm">
          <InputGroupInput
            aria-label="搜索杂物名称或描述"
            placeholder="搜索名称或描述…"
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
          title="筛选杂物"
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
          <SelectTrigger aria-label="杂物排序" className="ml-auto">
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
        <p role="status" className="mr-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground">
          共 <span className="font-medium tabular-nums text-foreground">{result.total}</span> 件杂物
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-4 pb-8">
          {result.rows.map((item) => (
            <MiscellanyCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <MiscellanyEmpty onClear={clear} />
      )}
    </section>
  );
}
