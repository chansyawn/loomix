export type FilterOption = {
  value: string;
  label: string;
  chipLabel?: string;
  children?: FilterOption[];
  count?: number;
  disabled?: boolean;
  selectable?: boolean;
  defaultExpanded?: boolean;
};

export type FilterGroup<K extends string> = {
  key: K;
  label: string;
  options: FilterOption[];
  fullWidth?: boolean;
  tree?: boolean;
  description?: string;
};

export function flattenFilterOptions(options: FilterOption[]): FilterOption[] {
  return options.flatMap((option) => [option, ...flattenFilterOptions(option.children ?? [])]);
}

export function filterTree(options: FilterOption[], term: string): FilterOption[] {
  if (!term) return options;
  return options.flatMap((option) => {
    const matches = option.label.includes(term);
    const children = matches ? (option.children ?? []) : filterTree(option.children ?? [], term);
    return matches || children.length > 0 ? [{ ...option, children }] : [];
  });
}
