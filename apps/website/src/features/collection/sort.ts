import type { SortingState } from "@tanstack/react-table";

export type CollectionSort = "original" | "name-asc" | "name-desc" | "quality-asc" | "quality-desc";

export function tableSorting(sort: CollectionSort): SortingState {
  return sort === "original"
    ? []
    : [{ id: sort.startsWith("name") ? "name" : "quality", desc: sort.endsWith("desc") }];
}

export function collectionSort(sorting: SortingState): CollectionSort {
  const [sort] = sorting;
  return sort && (sort.id === "name" || sort.id === "quality")
    ? `${sort.id}-${sort.desc ? "desc" : "asc"}`
    : "original";
}
