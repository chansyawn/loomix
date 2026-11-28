import { GiftLevelSchema, parseNeighbors } from "@loomix/schema/neighbors";
import type { Neighbor, Neighbors } from "@loomix/schema/neighbors";
import type { ImageRef } from "@loomix/schema/assets";
import type { NeighborDatabase } from "../source/neighbors/schema.ts";

export interface NeighborImageEntry {
  category: string;
  neighborId: number | null;
  image: ImageRef;
}

export function buildNeighbors(
  database: NeighborDatabase,
  image: (path: string | null, id: number, fieldPath: string) => ImageRef | null,
  additionalImages: readonly NeighborImageEntry[],
): Neighbors {
  const imageOf = (neighborId: number, category: "favour" | "role") => {
    const matches = additionalImages.filter(
      (entry) => entry.neighborId === neighborId && entry.category === category,
    );
    if (matches.length > 1) throw new Error(`Ambiguous ${category} image ${neighborId}`);
    return matches[0]?.image ?? null;
  };
  const neighbors = database.neighbors.map((neighbor): Neighbor => ({
    id: neighbor.id,
    name: neighbor.nameZh,
    bodyType: neighbor.bodyType,
    profile: {
      englishName: neighbor.profile.englishName,
      nickname: neighbor.profile.nickname,
      birthday: neighbor.profile.birthday,
    },
    images: { favour: imageOf(neighbor.id, "favour"), role: imageOf(neighbor.id, "role") },
    stars: database.stars
      .filter((star) => star.npcId === neighbor.id)
      .map((star, index) => ({
        name: star.nameZh,
        galaxy: star.galaxyNameZh,
        image: image(star.illustrationPath, neighbor.id, `stars.${index}.image`),
      })),
    abilities: neighbor.abilities.map(({ unlockLevel, name, description }) => ({
      unlockLevel,
      name,
      description,
    })),
    house: neighbor.house?.stages.length
      ? {
          stages: neighbor.house.stages.map((stage, index) => ({
            id: stage.id,
            level: stage.level,
            name: stage.name,
            description: stage.description,
            upgrade: stage.upgrade,
            image: image(stage.image, neighbor.id, `house.stages.${index}.image`),
          })),
        }
      : null,
    stories: database.stories
      .filter((story) => story.npcId === neighbor.id)
      .map((story, storyIndex) => ({
        chapter: story.chapter,
        title: story.titleZh,
        paragraphs: story.paragraphs.map((paragraph, index) => ({
          text: paragraph.bodyZh,
          image: image(
            paragraph.illustrationPath,
            neighbor.id,
            `stories.${storyIndex}.paragraphs.${index}.image`,
          ),
          layout: paragraph.layout,
        })),
      })),
    gifts: Object.fromEntries(
      GiftLevelSchema.options.map((level) => {
        const entries = database.giftPreferences.filter(
          (preference) => preference.npcId === neighbor.id && preference.level === level,
        );
        return [
          level,
          {
            itemIds: [...new Set(entries.flatMap((entry) => entry.itemIds))],
            tagIds: [...new Set(entries.flatMap((entry) => entry.tagIds))],
          },
        ];
      }),
    ) as Neighbor["gifts"],
  }));
  return parseNeighbors({ neighbors });
}
