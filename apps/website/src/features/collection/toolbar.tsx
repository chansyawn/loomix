import type { ReactNode } from "react";
import { ArrowDownUpIcon } from "lucide-react";
import { SearchInput } from "@/ui/components/search-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import type { CollectionLayout } from "./layout";
import { CollectionLayoutToggle } from "./layout-toggle";

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
  sortOptions: Partial<Record<S, string>>;
  onSortChange?: (value: S) => void;
  layout: CollectionLayout;
  onLayoutChange?: (value: CollectionLayout) => void;
  filters: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SearchInput
        className="min-w-48 flex-1 sm:max-w-sm"
        ariaLabel={searchLabel}
        placeholder={placeholder}
        value={query}
        onValueChange={onQueryChange}
        disabled={disabled}
      />
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
            {Object.entries(sortOptions).map(([value, label]) =>
              typeof label === "string" ? (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ) : null,
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
      <CollectionLayoutToggle
        title={title}
        layout={layout}
        onLayoutChange={onLayoutChange}
        disabled={disabled}
      />
      {actions}
    </div>
  );
}
