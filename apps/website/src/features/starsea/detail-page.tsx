import { DetailPage, type DetailSection } from "@/features/detail-page/detail-page";
import { hintField, textField } from "../detail-page/field-model";
import { DetailTitleMetadata, type DetailField } from "@/features/detail-page/detail-fields";
import { CatalogItemCard } from "@/features/omnidex/catalog-item-card";
import { relatedItemLocation } from "@/features/omnidex/entry-location";
import { RecordImage } from "@/features/omnidex/record-image";
import type { StarseaDetail } from "./view";

const relatedCardGrid = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3";

function IsletItems({ items }: { items: NonNullable<StarseaDetail["creatures"]> }) {
  return (
    <ul className={relatedCardGrid}>
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <CatalogItemCard item={item} itemId={item.id} link={relatedItemLocation(item)} />
        </li>
      ))}
    </ul>
  );
}

export function StarseaDetailPage({ islet }: { islet: StarseaDetail }) {
  const galaxies = [...new Set(islet.regions.map(({ galaxyName }) => galaxyName))];
  const hasEncounters = islet.regions.some((region) => region.neighbors.length);
  const explorationFields: DetailField[] = [];
  for (const region of islet.regions) {
    const suffix = islet.regions.length > 1 ? `（${region.name}）` : "";
    const methods = [
      region.exploration && "常规探索",
      region.neighbors.length > 0 && "邂逅候选",
    ].filter(Boolean);
    explorationFields.push(
      textField(`探索方式${suffix}`, methods.join("、")),
      { ...hintField(`区域解锁提示${suffix}`, region.unlockTip), fullWidth: true },
      {
        kind: "neighbors",
        label: `候选友邻${suffix}`,
        anchor: region.encounterAnchor,
        value: region.neighbors,
      },
    );
  }
  const sections: DetailSection[] = [];
  const status: string[] = [];
  for (const [id, label, items] of [
    ["creatures", "生物", islet.creatures],
    ["specialties", "特产", islet.specialties],
  ] as const) {
    if (items?.length)
      sections.push({
        id,
        title: `探索${label}`,
        content: (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              以下{label}来自星屿探索提示，实际产出受探索条件影响。
            </p>
            <IsletItems items={items} />
          </div>
        ),
      });
    else status.push(`${label}${items === null ? "未配置探索提示" : "没有展示条目"}`);
  }
  if (!hasEncounters) status.push("暂无已确认的邂逅友邻");
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
      fieldGroups={[
        {
          title: "基本信息",
          fields: [
            {
              kind: "tags",
              label: "所属星海区域",
              value: islet.regions.map(({ id, name }) => ({
                key: id,
                name,
                destination: { to: "/starsea", search: { region: id } },
              })),
            },
          ],
        },
        {
          title: "探索条件",
          fields: explorationFields,
          titleHint: hasEncounters
            ? "探索该区域的这座星屿时，有机会遇到列出的友邻。实际出场受探索和季遇状态影响。"
            : undefined,
        },
      ]}
      sections={sections}
    />
  );
}
