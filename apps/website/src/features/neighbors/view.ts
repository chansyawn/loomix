import { createImageResolver } from "@loomix/schema/assets";
import type { ImageIndex } from "@loomix/schema/assets";
import { createCatalogIndex, type Catalog } from "@loomix/schema/catalog";
import type { CatalogIndex } from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTagIndex, GameplayTags } from "@loomix/schema/gameplay-tags";
import type { Neighbor, Neighbors } from "@loomix/schema/neighbors";
import { neighborAvatar, resolveNeighborPortrait } from "./portrait";

type ImageResolver = ReturnType<typeof createImageResolver>;

const bodyTypes = { small: "小型", medium: "中型", big: "大型" } as const;
const giftLevels = [
  ["love", "喜爱"],
  ["favor", "好感"],
  ["dislike", "反感"],
] as const;

export function namedGiftPreferences(
  { neighbors }: Neighbors,
  itemId: number,
  image: ImageResolver,
) {
  return giftLevels.flatMap(([level, name]) => {
    const matches = neighbors
      .filter(({ gifts }) => gifts[level].itemIds.includes(itemId))
      .map((neighbor) => neighborAvatar(neighbor, image));
    return matches.length ? [{ level, name, neighbors: matches }] : [];
  });
}

function preferencesOf(
  neighbor: Neighbor,
  index: CatalogIndex,
  tags: GameplayTagIndex,
  image: ImageResolver,
) {
  return giftLevels.map(([level, name]) => ({
    level,
    name,
    items: neighbor.gifts[level].itemIds.map((id) => {
      const item = index.items.get(id);
      // 仅供引用的物品没有详情页，也没有图片。
      const listed = item && item.kind !== "reference" ? item : null;
      return {
        id,
        name: item?.name ?? `未收录物品（${id}）`,
        recordId: listed?.id ?? null,
        image: image(listed?.image ?? null),
      };
    }),
    tags: neighbor.gifts[level].tagIds.map((id) => ({ id, name: tagLabel(tags.get(id)) })),
  }));
}

export function toNeighborsView(
  database: Neighbors,
  imageIndex: ImageIndex,
  catalog: Catalog,
  gameplayTags: GameplayTags,
) {
  const image = createImageResolver(imageIndex);
  const index = createCatalogIndex(catalog);
  const tags = createGameplayTagIndex(gameplayTags.tags);
  const neighbors = database.neighbors.map((neighbor) => {
    const stars = neighbor.stars.map(({ name, galaxy }) => ({ name, galaxy }));
    const galaxies = [...new Set(stars.flatMap((star) => (star.galaxy ? [star.galaxy] : [])))];
    const { birthday } = neighbor.profile;
    return {
      id: neighbor.id,
      name: neighbor.name,
      bodyType: neighbor.bodyType ? bodyTypes[neighbor.bodyType] : null,
      stars,
      galaxies,
      portrait: resolveNeighborPortrait(neighbor.images, image),
      profile: {
        englishName: neighbor.profile.englishName,
        nickname: neighbor.profile.nickname,
        birthday: birthday === null ? null : `${birthday.month} 月 ${birthday.day} 日`,
      },
      abilities: neighbor.abilities.map((ability) => ({
        unlockLevel: ability.unlockLevel,
        name: ability.name ?? "未命名能力",
        description: ability.description,
      })),
      house: neighbor.house && {
        stages: neighbor.house.stages.map((stage) => ({ ...stage, image: image(stage.image) })),
      },
      preferences: preferencesOf(neighbor, index, tags, image),
      stories: [...neighbor.stories]
        .sort((a, b) => a.chapter - b.chapter)
        .map((story) => ({
          chapter: story.chapter,
          title: story.title,
          paragraphs: story.paragraphs.map((paragraph) => ({
            text: paragraph.text,
            layout: paragraph.layout,
            image: image(paragraph.image),
          })),
        })),
    };
  });
  return {
    neighbors,
    galaxies: [...new Set(neighbors.flatMap((neighbor) => neighbor.galaxies))],
  };
}

export type NeighborsData = ReturnType<typeof toNeighborsView>;
export type NeighborDetail = NeighborsData["neighbors"][number];
