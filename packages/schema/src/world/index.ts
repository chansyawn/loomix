import { z } from "zod";
import { ContextSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
const path = z
  .string()
  .min(1)
  .refine(
    (value) => !value.includes("\\") && !value.startsWith("/") && !value.split("/").includes(".."),
  );
const status = z.enum(["default", "encounter", "test", "placeholder", "unconfirmed"]);

const island = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1),
  sceneId: z.number().int().positive(),
  status,
  galaxyId: z.number().int().positive().nullable(),
  regionId: z.number().int().positive().nullable(),
  iconStyleId: z.number().int().positive(),
  image: ImageRefSchema.nullable(),
  neighborIds: z.number().int().positive().array(),
  unlockCondition: z.string().nullable(),
  displayCreatureIds: z.number().int().positive().array(),
  displaySpecialtyIds: z.number().int().positive().array(),
});

const islandIconStyle = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1),
  icon: ImageRefSchema.nullable(),
  variantIcon: ImageRefSchema.nullable(),
  entityPrefabPath: path,
});

const region = z.strictObject({
  id: z.number().int().positive(),
  galaxyId: z.number().int().positive(),
  layerId: z.number().int().positive(),
  name: z.string().min(1),
  sceneId: z.number().int().positive(),
  sdf: ImageRefSchema.nullable(),
  stationImage: ImageRefSchema.nullable(),
});

export const WorldSchema = ContextSchema.extend({
  kind: z.literal("world"),
  islands: island.array(),
  islandIconStyles: islandIconStyle.array(),
  regions: region.array(),
});
export type World = z.infer<typeof WorldSchema>;
export type Island = World["islands"][number];
export const parseWorld = (input: unknown): World => WorldSchema.parse(input);
export const isPublicIsland = (island: Island): boolean =>
  island.status === "default" || island.status === "encounter";
