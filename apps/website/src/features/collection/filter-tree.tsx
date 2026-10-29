import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/ui/components/button";
import { Checkbox } from "@/ui/components/checkbox";
import { Label } from "@/ui/components/label";
import type { FilterOption } from "./filter-types";

function subtreeContainsSelected(option: FilterOption, selected: string[]): boolean {
  return (
    selected.includes(option.value) ||
    (option.children ?? []).some((child) => subtreeContainsSelected(child, selected))
  );
}

export function FilterTreeOption({
  option,
  depth,
  selected,
  expanded,
  searchActive,
  onToggleValue,
  onExpandedChange,
}: {
  option: FilterOption;
  depth: number;
  selected: string[];
  expanded: ReadonlySet<string>;
  searchActive: boolean;
  onToggleValue: (value: string, checked: boolean) => void;
  onExpandedChange: (value: string, open: boolean) => void;
}) {
  const id = useId();
  const selectable = option.selectable !== false;
  const children = option.children ?? [];
  const checked = selectable && selected.includes(option.value);
  const indeterminate =
    selectable && !checked && children.some((child) => subtreeContainsSelected(child, selected));
  const disabled = selectable && !selected.includes(option.value) && Boolean(option.disabled);
  const isOpen = children.length > 0 && (searchActive || expanded.has(option.value));

  return (
    <li className="min-w-0">
      <div
        className="flex min-h-9 items-center gap-1.5 rounded-lg pr-2 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {children.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`${isOpen ? "收起" : "展开"}${option.label}`}
            aria-expanded={isOpen}
            onClick={() => onExpandedChange(option.value, !isOpen)}
          >
            {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
        ) : (
          <span aria-hidden="true" className="size-6 shrink-0" />
        )}
        {selectable ? (
          <>
            <Checkbox
              id={id}
              checked={checked}
              indeterminate={indeterminate}
              disabled={disabled}
              className="data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:before:h-0.5 data-indeterminate:before:w-2 data-indeterminate:before:rounded-full data-indeterminate:before:bg-primary-foreground data-indeterminate:[&>span>svg]:hidden"
              onCheckedChange={(value) => onToggleValue(option.value, value === true)}
            />
            <Label
              htmlFor={id}
              className={`min-w-0 flex-1 py-1.5 text-sm leading-5 ${
                disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"
              }`}
            >
              {option.label}
            </Label>
          </>
        ) : (
          <span className="min-w-0 flex-1 py-1.5 text-sm font-medium">{option.label}</span>
        )}
        {option.count !== undefined && (
          <span
            className={`w-8 shrink-0 text-right text-xs tabular-nums ${
              option.count === 0 ? "text-muted-foreground/60" : "text-muted-foreground"
            }`}
          >
            {option.count}
          </span>
        )}
      </div>
      {isOpen && (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <FilterTreeOption
              key={child.value}
              option={child}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              searchActive={searchActive}
              onToggleValue={onToggleValue}
              onExpandedChange={onExpandedChange}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
