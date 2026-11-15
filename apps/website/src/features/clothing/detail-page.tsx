import { ClothingCard } from "./clothing-card";
import {
  CollectionDetailLayout,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import type { ClothingDetail } from "./detail";
import { CollectionDetailNavigation } from "../collection/detail-navigation";

export function ClothingDetailPage({ detail }: { detail: ClothingDetail }) {
  return (
    <div className="min-w-0 space-y-6">
      <CollectionDetailNavigation model={detail.navigation} currentId={detail.record.id} />
      <ClothingDetailContent key={detail.record.id} detail={detail} />
    </div>
  );
}

function ClothingDetailContent({ detail }: { detail: ClothingDetail }) {
  const { record } = detail;
  const sections = clothingDetailSections(detail);
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
      {sections.length > 0 && <CollectionDetailExtras sections={sections} />}
    </CollectionDetailLayout>
  );
}

function clothingDetailSections(detail: ClothingDetail): CollectionDetailSection[] {
  const sections: CollectionDetailSection[] = [];
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
  return sections;
}
