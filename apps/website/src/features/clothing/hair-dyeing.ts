import type { createImageResolver } from "@loomix/schema/assets";
import { parseHairDyeing, type HairDyeing } from "@loomix/schema/hair-dyeing";
import type { createResourceReader } from "@/infrastructure/resources";
import type { IngredientItem } from "../omnidex-view";

const hairDyeingDocuments = new Map<string, Promise<HairDyeing>>();

type ColorChannels = HairDyeing["colorBlocks"][number]["displayColor"];
type ColorBlockKind = HairDyeing["colorBlocks"][number]["visualKind"];
type ResolveImage = ReturnType<typeof createImageResolver>;
export type DyeingItem = Pick<IngredientItem, "id" | "name" | "image" | "browsable">;
type DyeingCost = (DyeingItem & { quantity: number }) | null;

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
  unlockCost: DyeingCost;
  dyeCost: DyeingCost;
};
export type HairDyeingRegion = {
  id: number;
  name: string;
  groups: HairDyeingColorGroup[];
  defaultSwatch: HairDyeingSwatch | null;
};
export type ReadHairDyeing = () => Promise<HairDyeingRegion[]>;

function hexColor(channels: ColorChannels) {
  const bytes = channels[3] === 255 ? channels.slice(0, 3) : channels;
  return `#${bytes
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function hairstylePalette(
  data: HairDyeing,
  itemId: number,
  image: ResolveImage,
  items: ReadonlyMap<number, DyeingItem>,
) {
  const config = data.hairstyleConfigs.find((entry) => entry.itemId === itemId);
  if (!config) return [];
  const groups = new Map(data.colorGroups.map((group) => [group.id, group]));
  const blocks = new Map(data.colorBlocks.map((block) => [block.id, block]));
  function swatch(id: number | null): HairDyeingSwatch | null {
    const block = id === null ? undefined : blocks.get(id);
    return block
      ? {
          id: block.id,
          color: hexColor(block.displayColor),
          image: image(block.icon),
          kind: block.visualKind,
        }
      : null;
  }
  function cost(amount: HairDyeing["colorGroups"][number]["unlock"]["unlockCost"]): DyeingCost {
    if (!amount) return null;
    const item = items.get(amount.itemId) ?? {
      id: amount.itemId,
      name: `物品 #${amount.itemId}`,
      image: null,
      browsable: false,
    };
    return { ...item, quantity: amount.quantity };
  }

  return config.regions.flatMap((region): HairDyeingRegion[] => {
    const regionGroups = [...new Set(region.colorGroupIds)]
      .flatMap((id) => groups.get(id) ?? [])
      .sort((left, right) => left.unlock.sort - right.unlock.sort)
      .flatMap((group): HairDyeingColorGroup[] => {
        const swatches = [...new Set(group.colorBlockIds)].flatMap((id) => swatch(id) ?? []);
        return swatches.length
          ? [
              {
                id: group.id,
                name: group.name?.trim() || "未命名色系",
                color: hexColor(group.displayColor),
                image: image(group.icon),
                swatches,
                unlockCost: cost(group.unlock.unlockCost),
                dyeCost: cost(group.unlock.dyeCost),
              },
            ]
          : [];
      });
    const defaultSwatch = swatch(region.defaultColorBlockId);
    return regionGroups.length || defaultSwatch
      ? [{ id: region.id, name: region.name, groups: regionGroups, defaultSwatch }]
      : [];
  });
}

export function readHairDyeingData(load: ReturnType<typeof createResourceReader>) {
  return load("hair-dyeing", parseHairDyeing, hairDyeingDocuments);
}
