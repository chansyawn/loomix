import { createNameMatcher } from "@/infrastructure/name-search";
import type { NeighborsData } from "./data";
import type { NeighborsSearch } from "./search";

export function queryNeighbors(data: NeighborsData, search: NeighborsSearch) {
  const matchesName = createNameMatcher(search.q);
  return data.neighbors.filter(
    (neighbor) =>
      matchesName(neighbor.name) &&
      (!search.galaxy || neighbor.stars.some((star) => star.galaxy === search.galaxy)),
  );
}
