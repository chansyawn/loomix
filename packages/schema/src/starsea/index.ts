import { z } from "zod";
import { ImageRefSchema } from "../assets/index.ts";
import { IdSchema, NullableTextSchema } from "../common/identity.ts";

const EncounterSchema = z.strictObject({
  neighborId: IdSchema,
  candidateIslandIds: IdSchema.array().nullable(),
});

const RegionSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  galaxyName: z.string().min(1),
  unlockTip: NullableTextSchema,
  mapImage: ImageRefSchema.nullable(),
  stationImage: ImageRefSchema.nullable(),
  explorationIslandIds: IdSchema.array(),
  encounters: EncounterSchema.array(),
});

const IslandSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  iconStyleId: IdSchema,
  illustration: ImageRefSchema.nullable(),
  displayedCreatureIds: IdSchema.array().nullable(),
  displayedSpecialtyIds: IdSchema.array().nullable(),
});

const IconStyleSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  icon: ImageRefSchema.nullable(),
});

export const StarseaSchema = z.strictObject({
  regions: RegionSchema.array(),
  islands: IslandSchema.array(),
  iconStyles: IconStyleSchema.array(),
});

export type Starsea = z.infer<typeof StarseaSchema>;
export const parseStarsea = (input: unknown): Starsea => StarseaSchema.parse(input);
