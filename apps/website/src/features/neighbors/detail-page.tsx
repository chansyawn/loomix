import {
  DetailPage,
  type DetailField,
  type DetailSection,
} from "@/features/detail-page/detail-page";
import { DetailTitleMetadata } from "@/features/detail-page/detail-fields";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { NeighborPreferences } from "./preferences";
import { NeighborStories } from "./reading";
import { NeighborAbilitiesSection } from "./abilities-section";
import { NeighborHouseSection } from "./house-section";

export function NeighborDetailPage({ neighbor }: { neighbor: NeighborDetail }) {
  const homeFields: DetailField[] = [
    [
      "所属星球与星系",
      neighbor.stars
        .map((star) => `${star.name} · ${star.galaxy ? `${star.galaxy}星系` : "星系暂未收录"}`)
        .join("\n") || "暂未收录",
    ],
  ];
  const sections: DetailSection[] = [];
  const missing: string[] = [];
  if (neighbor.preferences.some((group) => group.items.length || group.tags.length))
    sections.push({
      id: "preferences",
      title: "送礼偏好",
      content: <NeighborPreferences preferences={neighbor.preferences} />,
    });
  else missing.push("送礼偏好");
  if (neighbor.abilities.length)
    sections.push({
      id: "abilities",
      title: "能力与亲密度",
      content: <NeighborAbilitiesSection abilities={neighbor.abilities} />,
    });
  else missing.push("能力");
  if (neighbor.house?.stages.length) {
    sections.push({
      id: "house",
      title: "房屋",
      content: <NeighborHouseSection stages={neighbor.house.stages} />,
    });
  } else missing.push("房屋");
  if (neighbor.stories.length)
    sections.push({
      id: "stories",
      title: "友邻故事",
      content: <NeighborStories neighbor={neighbor} />,
    });
  else missing.push("故事");
  return (
    <DetailPage
      overviewId="overview"
      titleId="neighbor-heading"
      title={neighbor.name}
      titleMetadata={
        <DetailTitleMetadata id={neighbor.id} category="友邻">
          {neighbor.bodyType ? `${neighbor.bodyType}体型` : "体型资料暂未收录"}
        </DetailTitleMetadata>
      }
      image={
        <NeighborImage
          image={neighbor.portrait?.image ?? null}
          name={`${neighbor.name}的${neighbor.portrait?.label ?? "肖像"}`}
          eager
          className="aspect-square p-4 sm:p-6"
        />
      }
      fieldGroups={[
        {
          title: "友邻资料",
          fields: [
            ["昵称", neighbor.profile.nickname ?? "资料暂未收录"],
            ["英文名", neighbor.profile.englishName ?? "资料暂未收录"],
            ["生日", neighbor.profile.birthday ?? "资料暂未收录"],
            ...(missing.length ? [["暂未收录", missing.join("、")] as const] : []),
          ],
        },
        { title: "星球归属", fields: homeFields },
      ]}
      sections={sections}
    />
  );
}
