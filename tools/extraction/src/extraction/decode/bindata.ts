import { z } from "zod";

const tagNode = z.object({
  TagId: z.number(),
  TagName: z.string(),
  ParentId: z.number(),
  EnumName: z.string().optional(),
});
const textReference = z.object({ textId: z.string().nullish() }).nullish();
const tagTree = z.object({ AllNodes: z.record(z.string(), tagNode) });
const tagDisplayMap = z.record(
  z.string(),
  z.record(z.string(), z.object({ nameInGame: textReference })),
);
const creatureDisplayMap = z.record(z.string(), z.object({ textContent: textReference }));

export type TagTree = z.infer<typeof tagTree>;
export type TagDisplay = Record<string, { nameInGame?: { textId?: string | null } | null }>;
export type TagDisplayMap = z.infer<typeof tagDisplayMap>;
export type CreatureDisplayMap = z.infer<typeof creatureDisplayMap>;

export function parseBinData(tags: unknown, tagDisplay: unknown, creatureDisplay: unknown) {
  const display = Object.values(tagDisplayMap.parse(tagDisplay))[0];
  if (!display) throw new Error("Missing TagUIData map");
  return {
    tree: tagTree.parse(tags).AllNodes,
    tagDisplay: display,
    display: creatureDisplayMap.parse(creatureDisplay),
  };
}
