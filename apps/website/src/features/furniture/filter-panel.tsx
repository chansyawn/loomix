import { SlidersHorizontalIcon } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Checkbox } from "@/ui/components/checkbox";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/components/sheet";
import type { FilterGroup } from "./query";
import type { FilterKey, ViewQuery } from "./search";

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
  const id = useId();
  const options = group.options.filter((option) => option.label.includes(term.trim()));
  return (
    <fieldset className="space-y-3 border-b border-border/70 pb-6">
      <legend className="mb-3 flex min-h-6 w-full items-center justify-between gap-3 text-sm font-semibold">
        <span className="flex min-w-0 items-center gap-2">
          <span>{group.label}</span>
          {selected.length > 0 && <Badge variant="secondary">已选 {selected.length}</Badge>}
        </span>
        {selected.length > 0 && (
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange([])}>
            清除
          </Button>
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
          <div
            key={option.value}
            className={`flex items-start gap-2 ${group.key === "sources" ? "col-span-2" : ""}`}
          >
            <Checkbox
              id={`${id}-${option.value}`}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value),
                )
              }
              className="mt-0.5"
            />
            <Label htmlFor={`${id}-${option.value}`} className="cursor-pointer leading-5">
              {option.label}
            </Label>
          </div>
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
      <SheetTrigger render={<Button variant="outline" />}>
        <SlidersHorizontalIcon />
        筛选
        {count > 0 && <Badge>{count}</Badge>}
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>筛选家具</SheetTitle>
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
