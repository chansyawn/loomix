import type { FilterGroup } from "./filter-panel";

export interface FilterChip {
  key: string;
  label: string;
  remove: () => void;
}

export function collectionFilterChips<K extends string>(
  groups: FilterGroup<K>[],
  selected: Record<K, string[]>,
  onFilter: (key: K, values: string[]) => void,
  search: { value: string; clear: () => void },
): FilterChip[] {
  const chips = groups.flatMap((group) =>
    selected[group.key].map((value) => ({
      key: `${group.key}-${value}`,
      label: `${group.label}：${group.options.find((option) => option.value === value)?.label ?? value}`,
      remove: () =>
        onFilter(
          group.key,
          selected[group.key].filter((item) => item !== value),
        ),
    })),
  );
  if (search.value)
    chips.unshift({ key: "q", label: `搜索：${search.value}`, remove: search.clear });
  return chips;
}
