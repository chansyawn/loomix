import { z } from "zod";

export const galaxies = ["禾夏", "诺森", "塔法", "帕沙"] as const;
export const neighborsSearchSchema = z.object({
  q: z.string().catch("").default(""),
  galaxy: z
    .enum(["", ...galaxies])
    .catch("")
    .default(""),
});
export type NeighborsSearch = z.output<typeof neighborsSearchSchema>;
