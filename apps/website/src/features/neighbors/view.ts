import type { createImageResolver } from "@loomix/schema/assets";
import { createCatalogIndex, isListedItem, type Catalog } from "@loomix/schema/catalog";
import type { CatalogIndex } from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTagIndex, GameplayTags } from "@loomix/schema/gameplay-tags";
import type { Neighbor, Neighbors } from "@loomix/schema/neighbors";
import { neighborAvatar, resolveNeighborPortrait } from "./portrait";
import { hasCatalogItemDetail } from "../omnidex/catalog";
import { cookingItemView } from "../dishes/recipe-items";
import { visibleTagIds } from "../omnidex/tags";
import { CATALOG_TAG_FILTER_POLICY } from "../catalog/tag-filter-policy";

type ImageResolver = ReturnType<typeof createImageResolver>;

const bodyTypes = { small: "小型", medium: "中型", big: "大型" } as const;
const giftLevels = [
  ["love", "喜爱"],
  ["favor", "好感"],
  ["dislike", "反感"],
] as const;

export function itemGiftPreferences(
  { neighbors }: Neighbors,
  item: { id: number; tagIds: readonly number[] },
  tagIndex: GameplayTagIndex,
  image: ImageResolver,
) {
  const itemTags = new Set(
    item.tagIds.flatMap((id) => tagIndex.ancestors(id).map((tag) => tag.id)),
  );
  return giftLevels.flatMap(([level, name]) => {
    const matches = neighbors.flatMap((neighbor) => {
      const { itemIds, tagIds } = neighbor.gifts[level];
      const specified = itemIds.includes(item.id);
      const matchedTags = [...new Set(tagIds)].filter((id) => itemTags.has(id));
      if (!specified && !matchedTags.length) return [];
      return [
        {
          ...neighborAvatar(neighbor, image),
          specified,
          tags: matchedTags.map((id) => tagLabel(tagIndex.get(id))),
        },
      ];
    });
    return matches.length ? [{ level, name, neighbors: matches }] : [];
  });
}

function preferencesOf(
  neighbor: Neighbor,
  index: CatalogIndex,
  tags: GameplayTagIndex,
  filterableTags: ReadonlySet<number>,
  image: ImageResolver,
) {
  return giftLevels
    .filter(
      ([level]) => neighbor.gifts[level].itemIds.length || neighbor.gifts[level].tagIds.length,
    )
    .map(([level, name]) => ({
      level,
      name,
      items: neighbor.gifts[level].itemIds.map((id) => {
        const item = index.items.get(id);
        return {
          id,
          name: item?.name ?? `未收录物品（${id}）`,
          recordId: item && hasCatalogItemDetail(item) ? id : null,
          image: item && isListedItem(item) ? image(item.image) : null,
          ...(item && cookingItemView(item, index.items, image)),
        };
      }),
      tags: neighbor.gifts[level].tagIds.map((id) => ({
        id,
        name: tagLabel(tags.get(id)),
        filterable: filterableTags.has(id),
      })),
    }));
}

export function toNeighborsView(
  database: Neighbors,
  image: ImageResolver,
  catalog: Catalog,
  gameplayTags: GameplayTags,
) {
  const index = createCatalogIndex(catalog);
  const tags = createGameplayTagIndex(gameplayTags.tags);
  const filterableTags = visibleTagIds(
    tags,
    catalog.items.filter(hasCatalogItemDetail),
    CATALOG_TAG_FILTER_POLICY,
  );
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
      preferences: preferencesOf(neighbor, index, tags, filterableTags, image),
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
