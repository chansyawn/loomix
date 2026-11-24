import type { LinkProps } from "@tanstack/react-router";
import {
  DetailPage,
  DetailRelatedGrid,
  type DetailSection,
} from "@/features/detail-page/detail-page";
import { CatalogItemCard } from "@/features/omnidex/catalog-item-card";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { RecordImage } from "@/features/omnidex/record-image";
import { VignetteRequirements } from "./requirements";
import { VignettePlacementRules, VignetteReferenceItems } from "./placement-reference";
import type { VignetteDetail } from "./view";

type RelatedEntry = VignetteDetail["neighbors"][number];

function RelatedEntries({
  title,
  entries,
  itemLink,
}: {
  title: string;
  entries: RelatedEntry[];
  itemLink: (entry: RelatedEntry) => LinkProps;
}) {
  return entries.length ? (
    <DetailRelatedGrid>
      {entries.map((entry) => (
        <CatalogItemCard key={entry.id} item={entry} itemId={entry.id} link={itemLink(entry)} />
      ))}
    </DetailRelatedGrid>
  ) : (
    <p className="text-sm text-muted-foreground">暂无关联{title}</p>
  );
}

export function VignetteDetailPage({ entry }: { entry: VignetteDetail }) {
  const sections: DetailSection[] = [
    {
      id: "vignette-requirements",
      title: "布景要求",
      content: <VignetteRequirements requirements={entry.requirements} />,
    },
  ];
  if (entry.placementRules.length) {
    sections.push({
      id: "vignette-rules",
      title: "摆放规则",
      content: <VignettePlacementRules rules={entry.placementRules} />,
    });
  }
  if (entry.referenceItems.length) {
    sections.push({
      id: "reference-items",
      title: "参考物品",
      content: <VignetteReferenceItems entry={entry} />,
    });
  }
  sections.push(
    {
      id: "related-neighbors",
      title: "关联友邻",
      content: (
        <RelatedEntries
          title="友邻"
          entries={entry.neighbors}
          itemLink={({ id }) => ({ to: "/neighbors/$id", params: { id: String(id) } })}
        />
      ),
    },
    {
      id: "related-creatures",
      title: "关联生物",
      content: (
        <RelatedEntries title="生物" entries={entry.creatures} itemLink={catalogEntryLocation} />
      ),
    },
  );
  return (
    <DetailPage
      image={
        <RecordImage
          key={entry.image}
          image={entry.image}
          name={entry.name}
          inset="none"
          eager
          className="aspect-2/1"
        />
      }
      title={entry.name}
      fields={[
        ["尺寸", entry.size],
        ["星级", entry.stars],
        ["地形", entry.terrain],
      ]}
      sections={sections}
    />
  );
}
