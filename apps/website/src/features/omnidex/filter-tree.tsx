import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/ui/components/button";
import { Checkbox } from "@/ui/components/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible";
import { Field, FieldLabel } from "@/ui/components/field";
import { cn } from "@/ui/lib/utils";
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
  selectionMode = "cascade",
  onToggleValue,
  onExpandedChange,
}: {
  option: FilterOption;
  depth: number;
  selected: string[];
  expanded: ReadonlySet<string>;
  searchActive: boolean;
  selectionMode?: "cascade" | "independent";
  onToggleValue: (value: string, checked: boolean) => void;
  onExpandedChange: (value: string, open: boolean) => void;
}) {
  const id = useId();
  const selectable = option.selectable !== false;
  const children = option.children ?? [];
  const checked = selectable && selected.includes(option.value);
  const indeterminate =
    selectionMode === "cascade" &&
    selectable &&
    !checked &&
    children.some((child) => subtreeContainsSelected(child, selected));
  const disabled = selectable && !selected.includes(option.value) && Boolean(option.disabled);
  const isOpen = children.length > 0 && (searchActive || expanded.has(option.value));

  return (
    <Collapsible
      render={<li className="min-w-0" />}
      open={isOpen}
      onOpenChange={(open) => onExpandedChange(option.value, open)}
    >
      <div
        className="flex min-h-9 items-center gap-1.5 rounded-lg pr-2 hover:bg-muted/50"
        style={{ paddingInlineStart: `calc(var(--spacing) * ${depth * 4})` }}
      >
        {children.length > 0 ? (
          <CollapsibleTrigger
            render={<Button variant="ghost" size="icon-xs" />}
            aria-label={`${isOpen ? "收起" : "展开"}${option.label}`}
          >
            {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </CollapsibleTrigger>
        ) : (
          <span aria-hidden="true" className="size-6 shrink-0" />
        )}
        {selectable ? (
          <Field
            orientation="horizontal"
            className="min-w-0 flex-1"
            data-disabled={disabled || undefined}
          >
            <Checkbox
              id={id}
              checked={checked}
              indeterminate={indeterminate}
              disabled={disabled}
              onCheckedChange={(value) => onToggleValue(option.value, value === true)}
            />
            <FieldLabel
              htmlFor={id}
              className={cn(
                "min-w-0 wrap-anywhere",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {option.label}
            </FieldLabel>
          </Field>
        ) : (
          <span className="min-w-0 flex-1 py-1.5 text-sm font-medium">{option.label}</span>
        )}
        {option.count !== undefined && (
          <span
            className={cn(
              "w-8 shrink-0 text-right text-xs tabular-nums",
              option.count === 0 ? "text-muted-foreground/60" : "text-muted-foreground",
            )}
          >
            {option.count}
          </span>
        )}
      </div>
      {children.length > 0 && (
        <CollapsibleContent>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {children.map((child) => (
              <FilterTreeOption
                key={child.value}
                option={child}
                depth={depth + 1}
                selected={selected}
                expanded={expanded}
                searchActive={searchActive}
                selectionMode={selectionMode}
                onToggleValue={onToggleValue}
                onExpandedChange={onExpandedChange}
              />
            ))}
          </ul>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
