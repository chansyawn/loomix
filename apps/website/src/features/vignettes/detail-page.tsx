import type { LinkProps } from "@tanstack/react-router";
import {
  CollectionDetailLayout,
  CollectionDetailRelatedGrid,
} from "@/features/collection/detail-layout";
import { CollectionItemCard } from "@/features/collection/collection-item-card";
import { recordLocation } from "@/features/collection/item-route";
import { RecordImage } from "@/features/collection/record-image";
import { VignetteRequirements } from "./requirements";
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
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">关联{title}</h2>
      {entries.length ? (
        <CollectionDetailRelatedGrid>
          {entries.map((entry) => (
            <CollectionItemCard
              key={entry.id}
              item={entry}
              itemId={entry.id}
              link={itemLink(entry)}
            />
          ))}
        </CollectionDetailRelatedGrid>
      ) : (
        <p className="text-sm text-muted-foreground">暂无关联{title}</p>
      )}
    </section>
  );
}

export function VignetteDetailPage({ entry }: { entry: VignetteDetail }) {
  return (
    <CollectionDetailLayout
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
    >
      <RelatedEntries
        title="友邻"
        entries={entry.neighbors}
        itemLink={({ id }) => ({ to: "/neighbors/$id", params: { id: String(id) } })}
      />
      <RelatedEntries title="生物" entries={entry.creatures} itemLink={recordLocation} />
      <VignetteRequirements requirements={entry.requirements} />
    </CollectionDetailLayout>
  );
}
