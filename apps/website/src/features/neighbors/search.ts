import { z } from "zod";
import type { NeighborsData } from "./data";

export const galaxies = ["禾夏", "诺森", "塔法", "帕沙"] as const;
export const neighborsSearchSchema = z.object({
  q: z.string().catch("").default(""),
  galaxy: z
    .enum(["", ...galaxies])
    .catch("")
    .default(""),
});
export type NeighborsSearch = z.output<typeof neighborsSearchSchema>;

export function queryNeighbors(data: NeighborsData, search: NeighborsSearch) {
  const text = search.q.trim().toLocaleLowerCase();
  return data.neighbors.filter(
    (neighbor) =>
      (!text ||
        [neighbor.name, ...neighbor.stars.map((star) => star.name)].some((name) =>
          name.toLocaleLowerCase().includes(text),
        )) &&
      (!search.galaxy || neighbor.stars.some((star) => star.galaxy === search.galaxy)),
  );
}
