import { DetailPage, type DetailSection } from "@/features/detail-page/detail-page";
import { DetailTitleMetadata } from "@/features/detail-page/detail-fields";
import { useDetailResource } from "../detail-page/use-detail-resource";
import type { loadNeighborDetail } from "./detail";
import { neighborPlaceFields, neighborProfileFields } from "./overview-fields";
import { NeighborImage } from "./image";
import { NeighborPreferences } from "./preferences";
import { NeighborStories } from "./reading";
import { NeighborAbilitiesSection } from "./abilities-section";
import { NeighborHouseSection } from "./house-section";

export function NeighborDetailPage({
  neighbor,
  readIslets,
  readVignettes,
}: Awaited<ReturnType<typeof loadNeighborDetail>>) {
  const islets = useDetailResource(readIslets);
  const vignettes = useDetailResource(readVignettes);
  const sections: DetailSection[] = [];
  if (neighbor.preferences.length)
    sections.push({
      id: "preferences",
      title: "友邻喜好",
      content: <NeighborPreferences preferences={neighbor.preferences} />,
    });
  if (neighbor.abilities.length)
    sections.push({
      id: "abilities",
      title: "能力与亲密度",
      content: <NeighborAbilitiesSection abilities={neighbor.abilities} />,
    });
  if (neighbor.house?.stages.length)
    sections.push({
      id: "house",
      title: "房屋",
      content: <NeighborHouseSection stages={neighbor.house.stages} />,
    });
  if (neighbor.stories.length)
    sections.push({
      id: "stories",
      title: "友邻故事",
      content: <NeighborStories neighbor={neighbor} />,
    });
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
          title: "基本信息",
          fields: [...neighborProfileFields(neighbor), ...neighborPlaceFields(islets, vignettes)],
        },
      ]}
      sections={sections}
    />
  );
}
