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

function findFilterOptionPath(options: FilterOption[], value: string): FilterOption[] | null {
  for (const option of options) {
    if (option.value === value) return [option];
    const childPath = findFilterOptionPath(option.children ?? [], value);
    if (childPath) return [option, ...childPath];
  }
  return null;
}

function selectableSubtreeValues(option: FilterOption): string[] {
  return flattenFilterOptions([option])
    .filter((item) => item.selectable !== false)
    .map((item) => item.value);
}

export function toggleFilterTreeSelection(
  options: FilterOption[],
  value: string,
  checked: boolean,
  selected: string[],
): string[] {
  const path = findFilterOptionPath(options, value);
  if (!path) return selected;

  const next = new Set(selected);
  const target = path.at(-1)!;
  for (const item of selectableSubtreeValues(target)) {
    if (checked) next.add(item);
    else next.delete(item);
  }

  for (let index = path.length - 2; index >= 0; index--) {
    const ancestor = path[index];
    if (ancestor.selectable === false) continue;
    const descendants = (ancestor.children ?? []).flatMap(selectableSubtreeValues);
    if (descendants.length > 0 && descendants.every((item) => next.has(item)))
      next.add(ancestor.value);
    else next.delete(ancestor.value);
  }

  const ordered = flattenFilterOptions(options).map((option) => option.value);
  const known = new Set(ordered);
  return [
    ...ordered.filter((item) => next.has(item)),
    ...selected.filter((item) => next.has(item) && !known.has(item)),
  ];
}

export function filterTree(options: FilterOption[], term: string): FilterOption[] {
  if (!term) return options;
  return options.flatMap((option) => {
    const matches = option.label.includes(term);
    const children = matches ? (option.children ?? []) : filterTree(option.children ?? [], term);
    return matches || children.length > 0 ? [{ ...option, children }] : [];
  });
}
