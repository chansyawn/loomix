import { z } from "zod";
import { stripSearchParams } from "@tanstack/react-router";
import { listLayoutSchema } from "../list-page/layout";

export const galaxies = ["禾夏", "诺森", "塔法", "帕沙"] as const;
export const neighborsSearchDefaults = { q: "", galaxy: "" } as const;
export const neighborsSearchSchema = z.object({
  q: z.string().catch(neighborsSearchDefaults.q).default(neighborsSearchDefaults.q),
  galaxy: z
    .enum(["", ...galaxies])
    .catch(neighborsSearchDefaults.galaxy)
    .default(neighborsSearchDefaults.galaxy),
  layout: listLayoutSchema,
});
export type NeighborsSearch = z.output<typeof neighborsSearchSchema>;
export const neighborsSearchMiddleware =
  stripSearchParams<NeighborsSearch>(neighborsSearchDefaults);
