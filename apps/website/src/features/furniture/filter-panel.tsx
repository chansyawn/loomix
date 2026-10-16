import { SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/components/sheet";
import type { FilterGroup, FilterKey, ViewQuery } from "./query";

function FilterOptions({
  group,
  selected,
  onChange,
}: {
  group: FilterGroup;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [term, setTerm] = useState("");
  const options = group.options.filter((option) => option.label.includes(term.trim()));
  return (
    <fieldset className="space-y-3 border-b border-border/70 pb-6">
      <legend className="mb-3 text-sm font-semibold">
        {group.label}
        {selected.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">已选 {selected.length}</span>
        )}
      </legend>
      {group.options.length > 10 && (
        <Input
          aria-label={`搜索${group.label}`}
          placeholder={`搜索${group.label}…`}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      )}
      <div className="grid max-h-56 grid-cols-2 gap-x-3 gap-y-3 overflow-y-auto py-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 text-sm leading-5 ${group.key === "sources" ? "col-span-2" : ""}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value),
                )
              }
              className="mt-0.5 size-4 shrink-0 accent-amber-400"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {options.length === 0 && <p className="text-xs text-muted-foreground">没有匹配的选项</p>}
    </fieldset>
  );
}

export function FilterPanel({
  groups,
  query,
  total,
  onFilter,
  onClear,
}: {
  groups: FilterGroup[];
  query: ViewQuery;
  total: number;
  onFilter: (key: FilterKey, values: string[]) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = groups.reduce((sum, group) => sum + query[group.key].length, 0);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="h-10 rounded-lg" />}>
        <SlidersHorizontalIcon />
        筛选
        {count > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>筛选家具</SheetTitle>
          <SheetDescription>组合条件，找到适合你的那一件。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {groups.map((group) => (
            <FilterOptions
              key={group.key}
              group={group}
              selected={query[group.key]}
              onChange={(values) => onFilter(group.key, values)}
            />
          ))}
        </div>
        <SheetFooter className="flex-row items-center justify-between border-t">
          <Button variant="ghost" onClick={onClear}>
            清空筛选
          </Button>
          <Button onClick={() => setOpen(false)}>查看 {total} 个结果</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
