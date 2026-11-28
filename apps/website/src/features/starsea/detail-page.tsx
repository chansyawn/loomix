import { DetailPage, type DetailSection } from "@/features/detail-page/detail-page";
import { textField } from "../detail-page/field-model";
import { DetailTitleMetadata, type DetailField } from "@/features/detail-page/detail-fields";
import { CatalogItemCard } from "@/features/omnidex/catalog-item-card";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { RecordImage } from "@/features/omnidex/record-image";
import type { StarseaDetail } from "./view";

const relatedCardGrid = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3";

function IsletItems({ items }: { items: NonNullable<StarseaDetail["creatures"]> }) {
  return (
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
  );
}

function EncounterSection({ neighbors }: { neighbors: StarseaDetail["encounterNeighbors"] }) {
  return (
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
  );
}

export function StarseaDetailPage({ islet }: { islet: StarseaDetail }) {
  const galaxies = [...new Set(islet.regions.map(({ galaxyName }) => galaxyName))];
  const unlockTips = islet.regions.flatMap(({ name, unlockTip }) =>
    unlockTip ? [islet.regions.length > 1 ? `${name} · ${unlockTip}` : unlockTip] : [],
  );
  const explorationFields: DetailField[] = [];
  const sections: DetailSection[] = [];
  const status: string[] = [];
  explorationFields.push(
    textField(
      "探索方式",
      islet.encounterOnly
        ? "邂逅候选"
        : islet.encounterNeighbors.length
          ? "常规探索、邂逅候选"
          : "常规探索",
    ),
  );
  if (unlockTips.length)
    explorationFields.push({
      kind: "hint",
      label: "区域解锁提示",
      value: unlockTips.join("\n"),
      fullWidth: true,
    });
  for (const [id, label, items] of [
    ["creatures", "生物", islet.creatures],
    ["specialties", "特产", islet.specialties],
  ] as const) {
    if (items?.length)
      sections.push({ id, title: `探索${label}`, content: <IsletItems items={items} /> });
    else status.push(`${label}${items === null ? "未配置探索提示" : "没有展示条目"}`);
  }
  const hasExplorationItems = sections.length > 0;
  const [neighbor] = islet.encounterNeighbors;
  if (!hasExplorationItems && islet.encounterNeighbors.length === 1) {
    explorationFields.push({
      kind: "neighbors",
      label: "候选友邻",
      value: [neighbor],
      note: "实际出场受探索和季遇状态影响。",
    });
  } else if (neighbor) {
    sections.push({
      id: "encounters",
      title: "邂逅友邻",
      content: <EncounterSection neighbors={islet.encounterNeighbors} />,
    });
  } else status.push("暂无已确认的邂逅友邻");
  if (status.length)
    explorationFields.push({
      kind: "hint",
      label: "资料状态",
      value: status.join("，"),
      fullWidth: true,
    });
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
        hasExplorationItems && (
          <p className="text-sm text-muted-foreground">
            生物与特产为探索提示，实际产出受探索条件影响。
          </p>
        )
      }
      fieldGroups={[
        {
          title: "地理归属",
          fields: [textField("所属星海", islet.regions.map(({ name }) => name).join("、"))],
        },
        { title: "探索条件", fields: explorationFields },
      ]}
      sections={sections}
    />
  );
}
