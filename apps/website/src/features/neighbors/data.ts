import {
  parseNeighborDatabase,
  parseNeighborImages,
  validateNeighborImages,
  type NeighborDatabase,
  type NeighborImages,
} from "@loomix/neighbor-schema";
import { resourceUrl } from "@/infrastructure/resources";

const bodyTypes = { small: "小型", medium: "中型", big: "大型" };
export const travelEvents: Record<string, string> = {
  Another_Stellarsea_First_arrival: "初次抵达其他星海",
  Collect_Luzhu_Num_In_Travel: "旅行中收集露珠",
  Get_Items_Num_In_Travel: "旅行中获得物品",
  Meet_Island_Num_In_Travel: "旅行中邂逅岛屿",
  My_Stellarsea_First_Arrival: "初次抵达自己的星海",
  Unlock_SpecialIsland_Num_In_Travel: "旅行中解锁特殊岛屿",
  New_Npc: "结识新友邻",
  Npc_First_Travel: "友邻初次旅行",
  Npc_Get_Items_Num_In_Travel: "友邻在旅行中获得物品",
};

export function toNeighborsView(database: NeighborDatabase, mapping: NeighborImages) {
  validateNeighborImages(database, mapping);
  const images = new Map(mapping.images.map((entry) => [entry.path, entry.image]));
  const image = (reference: string | null) => (reference ? (images.get(reference) ?? null) : null);
  const neighbors = database.neighbors.map((neighbor) => {
    const stars = database.stars
      .filter((star) => star.npcId === neighbor.id)
      .map((star) => ({
        key: star.key,
        name: star.nameZh,
        galaxy: star.galaxyNameZh,
        image: image(star.illustrationPath),
      }));
    const themes = database.furnishingThemes
      .filter((theme) => neighbor.furnishingThemeKeys.includes(theme.key))
      .map((theme) => ({
        key: theme.key,
        name: theme.nameZh,
        description: theme.descriptionZh,
        image: image(theme.coverPath),
      }));
    const stories = database.stories
      .filter((story) => story.npcId === neighbor.id)
      .sort((a, b) => a.chapter - b.chapter)
      .map((story) => ({
        key: story.key,
        chapter: story.chapter,
        title: story.titleZh,
        paragraphs: story.paragraphs.map((paragraph) => ({
          sequence: paragraph.sequence,
          text: paragraph.bodyZh,
          image: image(paragraph.illustrationPath),
          hasIllustration: paragraph.illustrationPath !== null,
        })),
      }));
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        reactions: { key: string; text: string; parameters: string | null }[];
      }
    >();
    for (const reaction of database.travelReactions) {
      if (reaction.npcId !== neighbor.id || !reaction.textZh?.trim()) continue;
      const key = reaction.conditionType ?? "unknown";
      const group = groups.get(key) ?? {
        key,
        name: travelEvents[key] ?? "其他旅行事件",
        reactions: [],
      };
      const parameters = [
        reaction.threshold === null ? null : `阈值：${reaction.threshold}`,
        reaction.resourceCategory === null ? null : `资源类别：${reaction.resourceCategory}`,
        reaction.secondaryThreshold === null ? null : `次级阈值：${reaction.secondaryThreshold}`,
      ]
        .filter((value): value is string => value !== null)
        .join(" · ");
      group.reactions.push({
        key: reaction.key,
        text: reaction.textZh,
        parameters: parameters || null,
      });
      groups.set(key, group);
    }
    return {
      id: neighbor.id,
      name: neighbor.nameZh,
      bodyType: neighbor.bodyType ? bodyTypes[neighbor.bodyType] : null,
      stars,
      image: stars[0]?.image ?? null,
      themes,
      stories,
      travel: [...groups.values()],
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

export async function loadNeighbors(request: typeof fetch = fetch): Promise<NeighborsData> {
  const [databaseResponse, imagesResponse] = await Promise.all([
    request(resourceUrl("neighbors.json")),
    request(resourceUrl("neighbor-images.json")),
  ]);
  if (!databaseResponse.ok || !imagesResponse.ok)
    throw new Error("Unable to load neighbor resources");
  const [database, images] = await Promise.all([databaseResponse.json(), imagesResponse.json()]);
  return toNeighborsView(parseNeighborDatabase(database), parseNeighborImages(images));
}
