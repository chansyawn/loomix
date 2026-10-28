import { parseNeighbors } from "@loomix/schema/neighbors";
import type { Neighbors } from "@loomix/schema/neighbors";
import { parseAssets, createImageResolver } from "@loomix/schema/assets";
import type { Assets } from "@loomix/schema/assets";
import { createResourceReader } from "@/infrastructure/resources";

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

export function toNeighborsView(database: Neighbors, assets: Assets) {
  if (database.snapshotId !== assets.snapshotId || database.locale !== assets.locale)
    throw new Error("Neighbor assets context mismatch");
  const image = createImageResolver(assets);
  const neighbors = database.neighbors.map((neighbor) => {
    const stars = database.stars
      .filter((star) => star.neighborId === neighbor.id)
      .map((star) => ({
        key: star.key,
        name: star.name,
        galaxy: star.galaxyName,
        image: image(star.image),
      }));
    const themes = database.furnishingThemes
      .filter((theme) => theme.neighborIds.includes(neighbor.id))
      .map((theme) => ({
        key: theme.key,
        name: theme.name,
        description: theme.description,
        image: image(theme.cover),
      }));
    const stories = database.stories
      .filter((story) => story.neighborId === neighbor.id)
      .sort((a, b) => a.chapter - b.chapter)
      .map((story) => ({
        key: story.key,
        chapter: story.chapter,
        title: story.title,
        paragraphs: story.paragraphs.map((paragraph) => ({
          sequence: paragraph.sequence,
          text: paragraph.text,
          image: image(paragraph.image),
          hasIllustration: paragraph.image !== null,
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
      if (reaction.neighborId !== neighbor.id || !reaction.text?.trim()) continue;
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
        text: reaction.text,
        parameters: parameters || null,
      });
      groups.set(key, group);
    }
    return {
      id: neighbor.id,
      name: neighbor.name,
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
  const load = createResourceReader(request);
  const [database, assets] = await Promise.all([
    load("neighbors", parseNeighbors),
    load("assets", parseAssets),
  ]);
  return toNeighborsView(database, assets);
}
