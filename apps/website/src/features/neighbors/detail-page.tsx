import {
  DetailPage,
  type DetailField,
  type DetailSection,
} from "@/features/detail-page/detail-page";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { NeighborPreferences } from "./preferences";
import { NeighborStories } from "./reading";
import { NeighborAbilitiesSection } from "./abilities-section";
import { NeighborHouseSection } from "./house-section";

export function NeighborDetailPage({ neighbor }: { neighbor: NeighborDetail }) {
  const heroImage = neighbor.favourImage ?? neighbor.roleImage;
  const heroLabel = neighbor.favourImage ? "好感插画" : "角色立绘";
  const fields: DetailField[] = [
    ["昵称", neighbor.profile.nickname ?? "资料暂未收录"],
    ["英文名", neighbor.profile.englishName ?? "资料暂未收录"],
    ["生日", neighbor.profile.birthday ?? "资料暂未收录"],
    ["体型", neighbor.bodyType ? `${neighbor.bodyType}体型` : "体型资料暂未收录"],
  ];
  if (neighbor.stars.length) {
    for (const star of neighbor.stars) {
      fields.push(
        ["所属星球", star.name],
        ["所属星系", star.galaxy ? `${star.galaxy}星系` : "星系资料暂未收录"],
      );
    }
  } else {
    fields.push(["所属星球与星系", "星球与星系资料暂未收录"]);
  }
  const sections: DetailSection[] = [
    {
      id: "preferences",
      headingId: "preferences-heading",
      title: "喜好信息",
      content: <NeighborPreferences preferences={neighbor.preferences} />,
    },
    {
      id: "abilities",
      headingId: "abilities-heading",
      title: "能力与亲密度",
      content: <NeighborAbilitiesSection abilities={neighbor.abilities} />,
    },
  ];
  if (neighbor.house) {
    sections.push({
      id: "house",
      headingId: "house-heading",
      title: "房屋",
      content: <NeighborHouseSection stages={neighbor.house.stages} />,
    });
  }
  sections.push({
    id: "stories",
    headingId: "stories-heading",
    title: "友邻故事",
    content: <NeighborStories neighbor={neighbor} />,
  });
  return (
    <DetailPage
      overviewId="overview"
      titleId="neighbor-heading"
      title={neighbor.name}
      image={
        <NeighborImage
          image={heroImage}
          name={`${neighbor.name}的${heroLabel}`}
          eager
          className="aspect-square p-4 sm:p-6"
        />
      }
      fields={fields}
      sections={sections}
    />
  );
}
