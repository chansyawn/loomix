import { DetailPage } from "@/features/detail-page/detail-page";
import { DetailTitleMetadata, type DetailField } from "@/features/detail-page/detail-fields";
import { CatalogItemCard } from "@/features/omnidex/catalog-item-card";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { RecordImage } from "@/features/omnidex/record-image";
import type { StarseaDetail } from "./view";

const relatedCardGrid = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3";

function IsletItems({ items }: { items: StarseaDetail["creatures"] }) {
  return items?.length ? (
    <ul className={relatedCardGrid}>
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <CatalogItemCard
            item={item}
            itemId={item.id}
            link={item.browsable ? catalogEntryLocation(item) : undefined}
          />
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">
      {items === null ? "未配置探索提示" : "没有展示条目"}
    </p>
  );
}

function EncounterSection({ neighbors }: { neighbors: StarseaDetail["encounterNeighbors"] }) {
  return neighbors.length > 0 ? (
    <>
      <p className="text-sm text-muted-foreground">实际出场受探索和季遇状态影响。</p>
      <ul className={relatedCardGrid}>
        {neighbors.map((neighbor) => (
          <li key={neighbor.id} className="min-w-0">
            <CatalogItemCard
              item={neighbor}
              itemId={neighbor.id}
              link={{ to: "/neighbors/$id", params: { id: String(neighbor.id) } }}
            />
          </li>
        ))}
      </ul>
    </>
  ) : (
    <p className="text-sm text-muted-foreground">暂无已确认的邂逅友邻</p>
  );
}

export function StarseaDetailPage({ islet }: { islet: StarseaDetail }) {
  const galaxies = [...new Set(islet.regions.map(({ galaxyName }) => galaxyName))];
  const unlockTips = [...new Set(islet.regions.flatMap(({ unlockTip }) => unlockTip ?? []))];
  const explorationFields: DetailField[] = [];
  if (islet.encounterOnly) explorationFields.push(["探索方式", "邂逅候选"]);
  if (unlockTips.length)
    explorationFields.push(["区域解锁提示", unlockTips.join("\n"), { fullWidth: true }]);
  return (
    <DetailPage
      image={
        <RecordImage
          key={islet.image}
          image={islet.image}
          name={islet.name}
          fit={islet.illustrated ? "cover" : "contain"}
          inset={islet.illustrated ? "none" : "lg"}
          eager
          className={islet.illustrated ? "aspect-video" : "aspect-2/1"}
        />
      }
      title={islet.name}
      titleMetadata={
        <DetailTitleMetadata id={islet.id} category="星屿">
          {galaxies.length
            ? galaxies.map((galaxy) => `${galaxy}星系`).join("、")
            : "所属星系未提供"}
        </DetailTitleMetadata>
      }
      description={
        <p className="text-sm text-muted-foreground">
          生物与特产为探索提示，实际产出受探索条件影响。
        </p>
      }
      fieldGroups={[
        {
          title: "地理归属",
          fields: [["所属星海", islet.regions.map(({ name }) => name).join("、")]],
        },
        { title: "探索条件", fields: explorationFields },
      ]}
      sections={[
        { id: "creatures", title: "生物", content: <IsletItems items={islet.creatures} /> },
        { id: "specialties", title: "特产", content: <IsletItems items={islet.specialties} /> },
        {
          id: "encounters",
          title: "邂逅友邻",
          content: <EncounterSection neighbors={islet.encounterNeighbors} />,
        },
      ]}
    />
  );
}
