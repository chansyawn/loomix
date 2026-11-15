import { createImageResolver } from "@loomix/schema/assets";
import type { Assets } from "@loomix/schema/assets";
import type { Catalog } from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";
import type { AdditionalNeighborImageCategory, Neighbors } from "@loomix/schema/neighbors";
import { createCatalogIndex, type CatalogIndex } from "./catalog-index";

type NeighborRecord = Neighbors["neighbors"][number];
type House = NonNullable<NeighborRecord["house"]>;
type ImageResolver = ReturnType<typeof createImageResolver>;

const bodyTypes = { small: "小型", medium: "中型", big: "大型" } as const;
const preferenceLevels = [
  ["love", "喜爱"],
  ["favor", "好感"],
  ["dislike", "反感"],
] as const;

function imageOfCategory(
  database: Neighbors,
  neighborId: number,
  category: AdditionalNeighborImageCategory,
  image: ImageResolver,
): string | null {
  const entry = database.additionalImages.find(
    (candidate) => candidate.neighborId === neighborId && candidate.category === category,
  );
  return entry ? image(entry.image) : null;
}

function preferencesOf(
  database: Neighbors,
  neighborId: number,
  index: CatalogIndex,
  tags: ReturnType<typeof createGameplayTagIndex>,
  image: ImageResolver,
) {
  return preferenceLevels.map(([level, name]) => {
    const entries = database.giftPreferences.filter(
      (entry) => entry.neighborId === neighborId && entry.level === level,
    );
    return {
      level,
      name,
      items: [...new Set(entries.flatMap((entry) => entry.itemIds))].map((id) => {
        const record = index.records.get(id);
        return {
          id,
          name: index.names.get(id) ?? `未收录物品（${id}）`,
          recordId: record?.id ?? null,
          image: image(record?.image ?? null),
        };
      }),
      tags: [...new Set(entries.flatMap((entry) => entry.tagIds))].map((id) => ({
        id,
        name: tagLabel(tags.get(id)),
      })),
    };
  });
}

function storiesOf(database: Neighbors, neighborId: number, image: ImageResolver) {
  return database.stories
    .filter((story) => story.neighborId === neighborId)
    .sort((a, b) => a.chapter - b.chapter)
    .map((story) => ({
      key: story.key,
      chapter: story.chapter,
      title: story.title,
      paragraphs: story.paragraphs.map((paragraph) => ({
        sequence: paragraph.sequence,
        text: paragraph.text,
        layout: paragraph.layout,
        image: image(paragraph.image),
      })),
    }));
}

function houseOf(house: House | null, index: CatalogIndex, image: ImageResolver) {
  if (house === null) return null;
  return {
    stages: house.stages.map((stage) => ({
      id: stage.id,
      level: stage.level,
      name: stage.name,
      description: stage.description,
      image: image(stage.image),
      upgradeRequirements:
        stage.upgradeRequirements === null
          ? null
          : {
              materials:
                stage.upgradeRequirements.materials?.map((item) => ({
                  id: item.itemId,
                  name: index.names.get(item.itemId) ?? `未收录物品（${item.itemId}）`,
                })) ?? null,
              blueprints:
                stage.upgradeRequirements.blueprints?.map((item) => ({
                  id: item.itemId,
                  name: index.names.get(item.itemId) ?? `未收录物品（${item.itemId}）`,
                })) ?? null,
            },
    })),
  };
}

export function toNeighborsView(
  database: Neighbors,
  assets: Assets,
  catalog: Catalog,
  gameplayTags: GameplayTags,
) {
  if (database.snapshotId !== assets.snapshotId || database.locale !== assets.locale)
    throw new Error("Neighbor assets context mismatch");
  if (
    catalog.snapshotId !== database.snapshotId ||
    catalog.locale !== database.locale ||
    catalog.formatVersion !== database.formatVersion
  )
    throw new Error("Neighbor catalog context mismatch");
  if (
    gameplayTags.snapshotId !== database.snapshotId ||
    gameplayTags.locale !== database.locale ||
    gameplayTags.formatVersion !== database.formatVersion
  )
    throw new Error("Neighbor tags context mismatch");
  const image = createImageResolver(assets);
  const index = createCatalogIndex(catalog);
  const tags = createGameplayTagIndex(gameplayTags.tags);
  const neighbors = database.neighbors.map((neighbor) => {
    const stars = database.stars
      .filter((star) => star.neighborId === neighbor.id)
      .map((star) => ({
        key: star.key,
        name: star.name,
        galaxy: star.galaxyName,
        image: image(star.image),
      }));
    return {
      id: neighbor.id,
      name: neighbor.name,
      bodyType: neighbor.bodyType ? bodyTypes[neighbor.bodyType] : null,
      stars,
      image: stars[0]?.image ?? null,
      favourImage: imageOfCategory(database, neighbor.id, "favour", image),
      roleImage: imageOfCategory(database, neighbor.id, "role", image),
      profile: {
        englishName: neighbor.profile.englishName,
        nickname: neighbor.profile.nickname,
        birthday:
          neighbor.profile.birthday === null
            ? null
            : `${neighbor.profile.birthday.month} 月 ${neighbor.profile.birthday.day} 日`,
      },
      abilities: neighbor.abilities.map((ability) => ({
        key: ability.key,
        unlockLevel: ability.unlockLevel,
        name: ability.name ?? "未命名能力",
        description: ability.description,
      })),
      house: houseOf(neighbor.house, index, image),
      preferences: preferencesOf(database, neighbor.id, index, tags, image),
      stories: storiesOf(database, neighbor.id, image),
    };
  });
  return {
    neighbors,
    galaxies: [
      ...new Set(
        neighbors.flatMap((neighbor) =>
          neighbor.stars.flatMap((star) => (star.galaxy ? [star.galaxy] : [])),
        ),
      ),
    ],
  };
}

export type NeighborsData = ReturnType<typeof toNeighborsView>;
export type NeighborDetail = NeighborsData["neighbors"][number];
