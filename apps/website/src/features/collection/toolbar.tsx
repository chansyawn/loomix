import type { ReactNode } from "react";
import { ArrowDownUpIcon, LayoutGridIcon, SearchIcon, TableIcon, XIcon } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import type { CollectionLayout } from "./layout";

export function CollectionToolbar<S extends string>({
  title,
  searchLabel,
  placeholder,
  query,
  onQueryChange,
  sort,
  sortOptions,
  onSortChange,
  layout,
  onLayoutChange,
  filters,
  actions,
  disabled = false,
}: {
  title: string;
  searchLabel: string;
  placeholder: string;
  query: string;
  onQueryChange?: (value: string, replace: boolean) => void;
  sort: S;
  sortOptions: Record<S, string>;
  onSortChange?: (value: S) => void;
  layout: CollectionLayout;
  onLayoutChange?: (value: CollectionLayout) => void;
  filters: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <InputGroup className="min-w-48 flex-1 sm:max-w-sm">
        <InputGroupInput
          aria-label={searchLabel}
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value, true)}
          disabled={disabled}
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="清除搜索"
              size="icon-xs"
              onClick={() => onQueryChange?.("", false)}
              disabled={disabled}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {filters}
      <Select
        items={sortOptions}
        value={sort}
        disabled={disabled}
        onValueChange={(value) => {
          if (value) onSortChange?.(value);
        }}
      >
        <SelectTrigger aria-label={`${title}排序`} className="ml-auto">
          <ArrowDownUpIcon />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {Object.entries<string>(sortOptions).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <ToggleGroup
        aria-label={`${title}展示方式`}
        variant="outline"
        spacing={0}
        value={[layout]}
        disabled={disabled}
        onValueChange={([value]) => {
          if (value === "grid" || value === "table") onLayoutChange?.(value);
        }}
      >
        <ToggleGroupItem value="grid" aria-label="卡片视图">
          <LayoutGridIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="table" aria-label="表格视图">
          <TableIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      {actions}
    </div>
  );
}
