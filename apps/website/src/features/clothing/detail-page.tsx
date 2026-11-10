import { ClothingCard } from "./clothing-card";
import {
  CollectionDetailLayout,
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import type { ClothingDetail } from "./detail";

export function ClothingDetailPage({ detail }: { detail: ClothingDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["风格", detail.record.styles],
          ["颜色", detail.record.colors],
          ["材质", detail.record.materials],
          ["获取途径", detail.record.acquisition],
        ]
      : detail.kind === "appearance"
        ? [["分类", detail.record.category]]
        : [
            ["套装名称", detail.record.setName],
            ["成员数量", detail.items === null ? null : `${detail.items.length} 件服装`],
          ];
  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
    >
      <ClothingExtras detail={detail} />
    </CollectionDetailLayout>
  );
}

function ClothingExtras({ detail }: { detail: ClothingDetail }) {
  const sections: CollectionDetailSection[] = [];
  if (detail.kind === "item" && detail.sets.length > 0)
    sections.push({
      key: "related-clothing",
      content: (
        <section aria-labelledby="related-clothing" className="space-y-4">
          <h2 id="related-clothing" className="text-lg font-semibold">
            所属套装
          </h2>
          <CollectionDetailRelatedGrid>
            {detail.sets.map((set) => (
              <ClothingCard key={set.id} record={set} />
            ))}
          </CollectionDetailRelatedGrid>
        </section>
      ),
    });
  if (detail.kind === "set" && detail.items?.length)
    sections.push({
      key: "related-clothing",
      content: (
        <section aria-labelledby="related-clothing" className="space-y-4">
          <h2 id="related-clothing" className="text-lg font-semibold">
            套装成员
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
            {detail.items.map((item) => (
              <ClothingCard key={item.id} record={item} />
            ))}
          </div>
        </section>
      ),
    });
  return <CollectionDetailExtras sections={sections} />;
}
