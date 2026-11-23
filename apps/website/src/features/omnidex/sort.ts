import type { SortingState } from "@tanstack/react-table";

export type ListSort = "original" | "name-asc" | "name-desc" | "quality-asc" | "quality-desc";

export function tableSorting(sort: ListSort): SortingState {
  return sort === "original"
    ? []
    : [{ id: sort.startsWith("name") ? "name" : "quality", desc: sort.endsWith("desc") }];
}

export function listSort(sorting: SortingState): ListSort {
  const [sort] = sorting;
  return sort && (sort.id === "name" || sort.id === "quality")
    ? `${sort.id}-${sort.desc ? "desc" : "asc"}`
    : "original";
}
