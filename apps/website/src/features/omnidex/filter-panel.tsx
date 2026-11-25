import { SlidersHorizontalIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { createNameMatcher } from "@/infrastructure/name-search";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Checkbox } from "@/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/ui/components/field";
import { SearchInput } from "@/ui/components/search-input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/components/sheet";
import { cn } from "@/ui/lib/utils";
import {
  filterSelectionValues,
  filterTree,
  flattenFilterOptions,
  toggleFilterSelection,
  expandedFilterTreeValues,
} from "./filter-types";
import type { FilterGroup } from "./filter-types";
import { FilterTreeOption } from "./filter-tree";

export type { FilterGroup, FilterOption } from "./filter-types";

function FilterOptions<K extends string>({
  group,
  selected,
  onChange,
  controls,
}: {
  group: FilterGroup<K>;
  selected: string[];
  onChange: (values: string[]) => void;
  controls?: ReactNode;
}) {
  const [term, setTerm] = useState("");
  const [expansionOverrides, setExpansionOverrides] = useState(() => new Map<string, boolean>());
  const expanded = expandedFilterTreeValues(
    group.options,
    group.selectionMode === "independent" ? selected : [],
  );
  for (const [value, open] of expansionOverrides) {
    if (open) expanded.add(value);
    else expanded.delete(value);
  }
  const id = useId();
  const searchActive = Boolean(term.trim());
  const matchesLabel = createNameMatcher(term);
  const options = !searchActive
    ? group.options
    : group.tree
      ? filterTree(group.options, matchesLabel)
      : group.options.filter((option) => matchesLabel(option.label));
  const selectedCount = filterSelectionValues(group, selected).length;
  const selectableCount = flattenFilterOptions(group.options).filter(
    (option) => option.selectable !== false,
  ).length;
  const setExpandedValue = (value: string, open: boolean) =>
    setExpansionOverrides((previous) => {
      const next = new Map(previous);
      next.set(value, open);
      return next;
    });
  return (
    <AccordionItem value={group.key}>
      <div className="relative flex items-center">
        <AccordionTrigger className="min-w-0 flex-1 items-center">
          <span className={cn("flex min-w-0 items-center gap-2", selectedCount > 0 && "pr-16")}>
            <span>{group.label}</span>
            {selectedCount > 0 && <Badge variant="secondary">已选 {selectedCount}</Badge>}
          </span>
        </AccordionTrigger>
        {selectedCount > 0 && (
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
      <AccordionContent>
        <FieldSet>
          <FieldLegend className="sr-only">{group.label}</FieldLegend>
          {controls}
          {selectableCount > 10 && (
            <SearchInput
              ariaLabel={`搜索${group.label}`}
              placeholder={`搜索${group.label}名称或拼音…`}
              value={term}
              onValueChange={setTerm}
            />
          )}
          {group.description && <FieldDescription>{group.description}</FieldDescription>}
          {group.tree ? (
            <ul className="flex flex-col gap-0.5 py-1">
              {options.map((option) => (
                <FilterTreeOption
                  key={option.value}
                  option={option}
                  depth={0}
                  selected={selected}
                  expanded={expanded}
                  searchActive={searchActive}
                  selectionMode={group.selectionMode}
                  onToggleValue={(value, checked) =>
                    onChange(toggleFilterSelection(group, value, checked, selected))
                  }
                  onExpandedChange={setExpandedValue}
                />
              ))}
            </ul>
          ) : (
            <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2">
              {options.map((option) => (
                <Field
                  key={option.value}
                  orientation="horizontal"
                  className={cn("min-w-0", group.fullWidth && "col-span-2")}
                >
                  <Checkbox
                    id={`${id}-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) =>
                      onChange(
                        toggleFilterSelection(group, option.value, checked === true, selected),
                      )
                    }
                  />
                  <FieldLabel
                    htmlFor={`${id}-${option.value}`}
                    className="min-w-0 cursor-pointer wrap-anywhere"
                  >
                    {option.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
          )}
          {options.length === 0 && <p className="text-xs text-muted-foreground">没有匹配的选项</p>}
        </FieldSet>
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
  renderGroupControls,
}: {
  title: string;
  groups: FilterGroup<K>[];
  query: Record<K, string[]>;
  total: number;
  onFilter: (key: K, values: string[]) => void;
  onClear: () => void;
  renderGroupControls?: (group: FilterGroup<K>) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const count = groups.reduce(
    (sum, group) => sum + filterSelectionValues(group, query[group.key]).length,
    0,
  );
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <SlidersHorizontalIcon data-icon="inline-start" />
        筛选
        {count > 0 && <Badge>{count}</Badge>}
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <Accordion
            defaultValue={groups[0] ? [groups[0].key] : []}
            multiple
            className="overflow-visible"
          >
            {groups.map((group) => (
              <FilterOptions
                key={group.key}
                group={group}
                selected={query[group.key]}
                controls={renderGroupControls?.(group)}
                onChange={(values) => onFilter(group.key, values)}
              />
            ))}
          </Accordion>
        </div>
        <SheetFooter className="flex-row items-center justify-between">
          <Button variant="ghost" onClick={onClear}>
            清空筛选
          </Button>
          <Button onClick={() => setOpen(false)}>查看 {total} 个结果</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
