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
import type { ListLayout } from "./layout";
import { ListLayoutToggle } from "./layout-toggle";

export function ListToolbar<S extends string>({
  title,
  searchLabel,
  placeholder,
  query,
  onQueryChange,
  sort,
  layout,
  onLayoutChange,
  filters,
  disabled = false,
}: ListToolbarProps<S>) {
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
      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        {sort && (
          <Select
            items={sort.options}
            value={sort.value}
            disabled={disabled}
            onValueChange={(value) => {
              if (value) sort.onChange?.(value);
            }}
          >
            <SelectTrigger aria-label={`${title}排序`}>
              <ArrowDownUpIcon />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(sort.options).map(([value, label]) =>
                  typeof label === "string" ? (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ) : null,
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        <ListLayoutToggle
          title={title}
          layout={layout}
          onLayoutChange={onLayoutChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export interface ListToolbarProps<S extends string> {
  title: string;
  searchLabel: string;
  placeholder: string;
  query: string;
  onQueryChange?: (value: string, replace: boolean) => void;
  sort?: { value: S; options: Partial<Record<S, string>>; onChange?: (value: S) => void };
  layout: ListLayout;
  onLayoutChange?: (value: ListLayout) => void;
  filters?: ReactNode;
  disabled?: boolean;
}
