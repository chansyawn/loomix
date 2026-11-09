import { parseCatalog, type Catalog } from "@loomix/schema/catalog";
import { parseNeighbors } from "@loomix/schema/neighbors";
import type { Neighbors } from "@loomix/schema/neighbors";
import { parseAssets, createImageResolver } from "@loomix/schema/assets";
import type { Assets } from "@loomix/schema/assets";
import { createResourceReader } from "@/infrastructure/resources";

const bodyTypes = { small: "小型", medium: "中型", big: "大型" };
const preferenceLevels = [
  ["love", "喜爱"],
  ["favor", "好感"],
  ["dislike", "反感"],
] as const;
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

export function toNeighborsView(database: Neighbors, assets: Assets, catalog: Catalog) {
  if (database.snapshotId !== assets.snapshotId || database.locale !== assets.locale)
    throw new Error("Neighbor assets context mismatch");
  if (
    catalog.snapshotId !== database.snapshotId ||
    catalog.locale !== database.locale ||
    catalog.formatVersion !== database.formatVersion
  )
    throw new Error("Neighbor catalog context mismatch");
  const image = createImageResolver(assets);
  const items = new Map(catalog.items.map((item) => [item.id, item.name]));
  const tags = new Map(
    database.giftPreferenceTags.map((tag) => [tag.id, tag.name || tag.internalName]),
  );
  const neighbors = database.neighbors.map((neighbor) => {
    const stars = database.stars
      .filter((star) => star.neighborId === neighbor.id)
      .map((star) => ({
        key: star.key,
        name: star.name,
        galaxy: star.galaxyName,
        image: image(star.image),
      }));
    const favour = database.additionalImages.find(
      (entry) => entry.neighborId === neighbor.id && entry.category === "favour",
    );
    const preferences = preferenceLevels.map(([level, name]) => {
      const entries = database.giftPreferences.filter(
        (entry) => entry.neighborId === neighbor.id && entry.level === level,
      );
      return {
        level,
        name,
        items: [...new Set(entries.flatMap((entry) => entry.itemIds))].map((id) => ({
          id,
          name: items.get(id) ?? `未收录物品（${id}）`,
        })),
        tags: [...new Set(entries.flatMap((entry) => entry.tagIds))].map((id) => ({
          id,
          name: tags.get(id) ?? `未收录标签（${id}）`,
        })),
      };
    });
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
      favourImage: image(favour?.image ?? null),
      preferences,
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
  const [database, assets, catalog] = await Promise.all([
    load("neighbors", parseNeighbors),
    load("assets", parseAssets),
    load("catalog", parseCatalog),
  ]);
  return toNeighborsView(database, assets, catalog);
}
