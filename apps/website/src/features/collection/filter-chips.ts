import { flattenFilterOptions } from "./filter-types";
import type { FilterGroup } from "./filter-types";

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
    selected[group.key].map((value) => {
      const option = flattenFilterOptions(group.options).find((item) => item.value === value);
      return {
        key: `${group.key}-${value}`,
        label: option?.chipLabel ?? `${group.label}：${option?.label ?? value}`,
        remove: () =>
          onFilter(
            group.key,
            selected[group.key].filter((item) => item !== value),
          ),
      };
    }),
  );
  if (search.value)
    chips.unshift({ key: "q", label: `搜索：${search.value}`, remove: search.clear });
  return chips;
}
