import { z } from "zod";
import { IdSchema } from "../common/identity.ts";
import { CatalogItemBaseSchema } from "./common.ts";

export const NeighborClothingSchema = CatalogItemBaseSchema.extend({
  kind: z.literal("neighborClothing"),
  slotCode: IdSchema,
  neighborId: IdSchema.nullable(),
  playerItemId: IdSchema.nullable(),
  modelPaths: z.strictObject({
    small: z.string().min(1).nullable(),
    medium: z.string().min(1).nullable(),
    big: z.string().min(1).nullable(),
  }),
}).superRefine((value, ctx) => {
  if (!value.modelPaths.small && !value.modelPaths.medium && !value.modelPaths.big)
    ctx.addIssue({ code: "custom", path: ["modelPaths"], message: "需要至少一种体型模型" });
  if (value.neighborId === null && value.playerItemId === null)
    ctx.addIssue({ code: "custom", path: ["neighborId"], message: "需要一个可解析的关联" });
  const offers = value.trade?.offers ?? [];
  if (new Set(offers.map((offer) => offer.id)).size !== offers.length)
    ctx.addIssue({ code: "custom", path: ["trade", "offers"], message: "商品 ID 不得重复" });
});

export type NeighborClothing = z.infer<typeof NeighborClothingSchema>;
