import { parseNeighbors } from "@loomix/schema/neighbors";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { Dataset } from "@loomix/schema/dataset";
import type { ImageRef } from "@loomix/schema/assets";
import type { NeighborDatabase } from "../extraction/neighbors/schema.ts";

export function buildNeighbors(
  database: NeighborDatabase,
  identity: Dataset["context"],
  image: (path: string | null) => ImageRef | null,
  additionalImages: Neighbors["additionalImages"],
): Neighbors {
  return parseNeighbors({
    ...identity,
    kind: "neighbors",
    neighbors: database.neighbors.map((neighbor) => ({
      id: neighbor.id,
      name: neighbor.nameZh,
      bodyType: neighbor.bodyType,
      scaleValue: neighbor.scaleValue,
      avatar: image(neighbor.avatarPath),
      npc2Path: neighbor.npc2Path,
      profile: neighbor.profile,
      travelProfile: neighbor.travelProfile,
      abilityDescriptions: neighbor.abilityDescriptions,
      abilities: neighbor.abilities.map((ability) => ({ ...ability, icon: image(ability.icon) })),
      signature: neighbor.signature,
      design: neighbor.design,
      house:
        neighbor.house === null
          ? null
          : {
              ...neighbor.house,
              stages: neighbor.house.stages.map((stage) => ({
                ...stage,
                image: image(stage.image),
              })),
            },
    })),
    stars: database.stars.map(({ npcId, nameZh, galaxyNameZh, illustrationPath, ...star }) => ({
      ...star,
      neighborId: npcId,
      name: nameZh,
      galaxyName: galaxyNameZh,
      image: image(illustrationPath),
    })),
    stories: database.stories.map(({ npcId, titleZh, paragraphs, ...story }) => ({
      ...story,
      neighborId: npcId,
      title: titleZh,
      paragraphs: paragraphs.map(({ bodyZh, illustrationPath, ...paragraph }) => ({
        ...paragraph,
        text: bodyZh,
        image: image(illustrationPath),
      })),
    })),
    travelReactions: database.travelReactions.map(({ npcId, textZh, ...reaction }) => ({
      ...reaction,
      neighborId: npcId,
      text: textZh,
    })),
    friendshipRules: database.friendshipRules.map(({ titleZh, textZh, ...rule }) => ({
      ...rule,
      title: titleZh,
      text: textZh,
    })),
    eventTags: database.eventTags.map(({ textZh, ...tag }) => ({ ...tag, text: textZh })),
    giftPreferences: database.giftPreferences.map(({ npcId, ...preference }) => ({
      ...preference,
      neighborId: npcId,
    })),
    resources: database.assets,
    additionalImages,
  });
}

export function neighborReferencedItemIds(database: NeighborDatabase): number[] {
  return [
    ...new Set(
      [
        ...database.giftPreferences.flatMap((preference) => preference.itemIds),
        ...database.neighbors.flatMap((neighbor) => [
          neighbor.signature.friendshipOutfitItemId,
          neighbor.house?.buildingPackageItemId ?? null,
          ...(neighbor.house?.stages.flatMap((stage) =>
            [
              ...(stage.upgradeRequirements?.materials ?? []),
              ...(stage.upgradeRequirements?.blueprints ?? []),
            ].map((amount) => amount.itemId),
          ) ?? []),
        ]),
      ].filter((id): id is number => id !== null),
    ),
  ].sort((a, b) => a - b);
}
