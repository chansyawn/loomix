import type { createImageResolver } from "@loomix/schema/assets";
import { parseHairDyeing, type HairDyeing } from "@loomix/schema/hair-dyeing";
import type { createResourceReader } from "@/infrastructure/resources";

const hairDyeingDocuments = new Map<string, Promise<HairDyeing>>();

type ColorChannels = HairDyeing["colorBlocks"][number]["displayColor"];
type ColorBlockKind = HairDyeing["colorBlocks"][number]["visualKind"];
type ResolveImage = ReturnType<typeof createImageResolver>;

export type HairDyeingSwatch = {
  id: number;
  color: string;
  image: string | null;
  kind: ColorBlockKind;
};
export type HairDyeingColorGroup = {
  id: number;
  name: string;
  color: string;
  image: string | null;
  swatches: HairDyeingSwatch[];
};
export type HairDyeingRegion = {
  id: number;
  name: string;
  groups: HairDyeingColorGroup[];
};
export type ReadHairDyeing = () => Promise<HairDyeingRegion[]>;

function hexColor(channels: ColorChannels) {
  const bytes = channels[3] === 255 ? channels.slice(0, 3) : channels;
  return `#${bytes
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function hairstylePalette(data: HairDyeing, itemId: number, image: ResolveImage) {
  const config = data.hairstyleConfigs.find((entry) => entry.itemId === itemId);
  if (!config) return [];
  const groups = new Map(data.colorGroups.map((group) => [group.id, group]));
  const blocks = new Map(data.colorBlocks.map((block) => [block.id, block]));

  return config.regions.flatMap((region): HairDyeingRegion[] => {
    const regionGroups = [...new Set(region.colorGroupIds)]
      .flatMap((id) => groups.get(id) ?? [])
      .sort((left, right) => left.unlock.sort - right.unlock.sort)
      .flatMap((group): HairDyeingColorGroup[] => {
        const swatches = [...new Set(group.colorBlockIds)].flatMap((id): HairDyeingSwatch[] => {
          const block = blocks.get(id);
          return block
            ? [
                {
                  id,
                  color: hexColor(block.displayColor),
                  image: image(block.icon),
                  kind: block.visualKind,
                },
              ]
            : [];
        });
        return swatches.length
          ? [
              {
                id: group.id,
                name: group.name?.trim() || "未命名色系",
                color: hexColor(group.displayColor),
                image: image(group.icon),
                swatches,
              },
            ]
          : [];
      });
    return regionGroups.length ? [{ id: region.id, name: region.name, groups: regionGroups }] : [];
  });
}

export async function readHairstylePalette(
  load: ReturnType<typeof createResourceReader>,
  itemId: number,
  image: ResolveImage,
) {
  return hairstylePalette(
    await load("hair-dyeing", parseHairDyeing, hairDyeingDocuments),
    itemId,
    image,
  );
}
