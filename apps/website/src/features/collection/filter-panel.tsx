import { SlidersHorizontalIcon } from "lucide-react";
import { useId, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
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
import { filterTree, flattenFilterOptions } from "./filter-types";
import type { FilterGroup } from "./filter-types";
import { FilterTreeOption } from "./filter-tree";

export type { FilterGroup, FilterOption } from "./filter-types";

function FilterOptions<K extends string>({
  group,
  selected,
  onChange,
}: {
  group: FilterGroup<K>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [term, setTerm] = useState("");
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        flattenFilterOptions(group.options)
          .filter((option) => option.defaultExpanded)
          .map((option) => option.value),
      ),
  );
  const id = useId();
  const normalizedTerm = term.trim();
  const options = group.tree
    ? filterTree(group.options, normalizedTerm)
    : group.options.filter((option) => option.label.includes(normalizedTerm));
  const selectableCount = flattenFilterOptions(group.options).filter(
    (option) => option.selectable !== false,
  ).length;
  const setExpandedValue = (value: string, open: boolean) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (open) next.add(value);
      else next.delete(value);
      return next;
    });
  return (
    <AccordionItem
      value={group.key}
      className="border-b border-border/70 last:border-b-0 data-open:bg-transparent"
    >
      <div className="relative flex items-center">
        <AccordionTrigger className="min-w-0 flex-1 items-center gap-3 border-0 px-0 py-2 hover:no-underline">
          <span className={`flex min-w-0 items-center gap-2 ${selected.length > 0 ? "pr-16" : ""}`}>
            <span>{group.label}</span>
            {selected.length > 0 && <Badge variant="secondary">已选 {selected.length}</Badge>}
          </span>
        </AccordionTrigger>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="absolute right-7"
            aria-label={`清除${group.label}筛选`}
            onClick={() => onChange([])}
          >
            清除
          </Button>
        )}
      </div>
      <AccordionContent className="pb-4">
        <fieldset className="space-y-3">
          <legend className="sr-only">{group.label}</legend>
          {selectableCount > 10 && (
            <Input
              aria-label={`搜索${group.label}`}
              placeholder={`搜索${group.label}…`}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          )}
          {group.description && (
            <p className="text-xs leading-5 text-muted-foreground">{group.description}</p>
          )}
          {group.tree ? (
            <ul className="space-y-0.5 py-1">
              {options.map((option) => (
                <FilterTreeOption
                  key={option.value}
                  option={option}
                  depth={0}
                  selected={selected}
                  inherited={false}
                  expanded={expanded}
                  searchActive={normalizedTerm.length > 0}
                  onToggleValue={(value, checked) =>
                    onChange(
                      checked
                        ? [...selected, value]
                        : selected.filter((selectedValue) => selectedValue !== value),
                    )
                  }
                  onExpandedChange={setExpandedValue}
                />
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 py-1">
              {options.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start gap-2 ${group.fullWidth ? "col-span-2" : ""}`}
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
          )}
          {options.length === 0 && <p className="text-xs text-muted-foreground">没有匹配的选项</p>}
        </fieldset>
      </AccordionContent>
    </AccordionItem>
  );
}

export function FilterPanel<K extends string>({
  title,
  groups,
  query,
  total,
  onFilter,
  onClear,
}: {
  title: string;
  groups: FilterGroup<K>[];
  query: Record<K, string[]>;
  total: number;
  onFilter: (key: K, values: string[]) => void;
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
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <Accordion
            defaultValue={groups[0] ? [groups[0].key] : []}
            multiple
            className="overflow-visible rounded-none border-0"
          >
            {groups.map((group) => (
              <FilterOptions
                key={group.key}
                group={group}
                selected={query[group.key]}
                onChange={(values) => onFilter(group.key, values)}
              />
            ))}
          </Accordion>
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
