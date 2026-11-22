import { emptyDataset } from "../src/dataset/index.ts";
import type { Dataset } from "../src/dataset/index.ts";
import type { Collection, ItemOf } from "../src/catalog/index.ts";
import type { Neighbor } from "../src/neighbors/index.ts";
import type { Vignette } from "../src/vignettes/index.ts";
import { FORMAT_VERSION } from "../src/common/identity.ts";

export const context = {
  formatVersion: FORMAT_VERSION,
  datasetId: "a".repeat(64),
  locale: "zh-CN",
} as const;
export const source = {
  gameVersion: "test",
  dataRevision: 1,
  resourceRevision: 1,
  manifestId: "1",
};

export const datasetFixture = (): Dataset => emptyDataset(context, source);

export const vignette = (id = 1002): Vignette => ({
  id,
  name: { zh: "微风花丛地", en: "Breezy Flowerbed" },
  illustration: { assetId: "flowerbed", variant: "illustration" },
  stars: 2,
  footprint: { width: 6, height: 6 },
  site: "land",
  requirements: [
    {
      target: { itemId: 2 },
      support: null,
      quantity: { configured: 6, displayed: 6 },
      area: null,
      label: { zh: "任意花株", en: "Any Flower" },
      examples: [],
    },
  ],
  placementRules: [{ kind: "range", ruleId: 1, text: null }],
  creatureItemIds: [],
  neighborIds: [],
  hints: [],
});

const listed = {
  name: "物品",
  description: null,
  image: null,
  quality: null,
  acquisition: null,
  tagIds: [] as number[],
};

export const material = (id: number): ItemOf<"material"> => ({ ...listed, id, kind: "material" });
export const reference = (id: number): ItemOf<"reference"> => ({
  id,
  kind: "reference",
  name: "引用",
  description: null,
});
export const plant = (id: number): ItemOf<"plant"> => ({
  ...listed,
  id,
  kind: "plant",
  category: null,
  flowerColors: null,
  drops: null,
});
export const dish = (id: number): ItemOf<"dish"> => ({
  ...listed,
  id,
  kind: "dish",
  strength: null,
  effects: null,
  cooking: null,
});
export const seed = (id: number, growth: ItemOf<"seed">["growth"]): ItemOf<"seed"> => ({
  ...listed,
  id,
  kind: "seed",
  growth,
});

const noGift = { itemIds: [], tagIds: [] };
export const neighbor = (id: number): Neighbor => ({
  id,
  name: "蛮蛮",
  bodyType: null,
  profile: { englishName: null, nickname: null, birthday: null },
  images: { favour: null, role: null },
  stars: [],
  abilities: [],
  house: null,
  stories: [],
  gifts: { love: noGift, favor: noGift, dislike: noGift },
});

export const collection = (
  id: number,
  memberKind: Collection["memberKind"],
  memberIds: number[] | null,
): Collection => {
  const { kind: _kind, tagIds: _tagIds, ...base } = material(id);
  return { ...base, memberKind, memberIds };
};
