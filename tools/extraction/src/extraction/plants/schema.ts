import { z } from "zod";
import { createGrowthSchema, SeedDataSchema } from "@loomix/schema/catalog";

const image = z.string().min(1).nullable();
export const ObservedGrowthSchema = createGrowthSchema(image);
export const ObservedSeedDataSchema = SeedDataSchema.omit({ image: true }).extend({ image });
export type ObservedGrowth = z.infer<typeof ObservedGrowthSchema>;
export type ObservedSeed = z.infer<typeof ObservedSeedDataSchema>;
