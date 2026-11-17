import { z } from "zod";
import { createObservedGrowthSchema, createObservedSeedSchema } from "../../../schemas/observed.ts";

const image = z.string().min(1).nullable();
export const ObservedGrowthSchema = createObservedGrowthSchema(image);
export const ObservedSeedDataSchema = createObservedSeedSchema(image);
export type ObservedGrowth = z.infer<typeof ObservedGrowthSchema>;
export type ObservedSeed = z.infer<typeof ObservedSeedDataSchema>;
