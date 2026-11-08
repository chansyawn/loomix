import { z } from "zod";
import { createGrowthSchema, SeedSchema } from "@loomix/schema/catalog";

const image = z.string().min(1).nullable();
export const ObservedGrowthSchema = createGrowthSchema(image);
export const ObservedSeedSchema = SeedSchema.omit({ image: true }).extend({ image });
export type ObservedGrowth = z.infer<typeof ObservedGrowthSchema>;
export type ObservedSeed = z.infer<typeof ObservedSeedSchema>;
