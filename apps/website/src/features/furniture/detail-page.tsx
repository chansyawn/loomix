import { FurnitureCard } from "./furniture-card";
import {
  CollectionDetailLayout,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { CollectionItemCard } from "@/features/collection/collection-item-card";
import { recordLocation } from "@/features/collection/item-route";
import type { FurnitureItem } from "../collection-view";
import type { FurnitureDetail } from "./detail";
import { CollectionDetailNavigation } from "../collection/detail-navigation";

export function FurnitureDetailPage({ detail }: { detail: FurnitureDetail }) {
  return (
    <div className="min-w-0 space-y-6">
      <CollectionDetailNavigation model={detail.navigation} currentId={detail.record.id} />
      <FurnitureDetailContent key={detail.record.id} detail={detail} />
    </div>
  );
}

function FurnitureDetailContent({ detail }: { detail: FurnitureDetail }) {
  const { record } = detail;
  const sections = furnitureDetailSections(detail);
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["类型", detail.record.furnitureCategory],
          ["尺寸", detail.record.size],
          ["颜色", detail.record.colors],
          ["材质", detail.record.materials],
          ["获取途径", detail.record.acquisition],
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 件家具`],
        ];
  return (
    <CollectionDetailLayout
      image={
        <FurnitureImage
          key={record.image}
          image={record.image}
          name={record.name}
          fit={detail.kind === "set" ? "cover" : "contain"}
          inset={detail.kind === "set" ? "none" : "lg"}
          className={detail.kind === "set" ? "aspect-2/1" : undefined}
          eager
        />
      }
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

function furnitureDetailSections(detail: FurnitureDetail): CollectionDetailSection[] {
  const sections: CollectionDetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.recipes?.length)
      sections.push({
        key: "furniture-recipes",
        content: <FurnitureRecipes recipes={detail.recipes} />,
      });
  } else if (detail.items?.length) {
    sections.push({
      key: "furniture-set-members",
      content: <FurnitureSetMembers items={detail.items} />,
    });
  }
  return sections;
}

function FurnitureRecipes({
  recipes,
}: {
  recipes: NonNullable<Extract<FurnitureDetail, { kind: "item" }>["recipes"]>;
}) {
  return (
    <section aria-labelledby="furniture-recipes" className="space-y-4">
      <h2 id="furniture-recipes" className="text-lg font-semibold">
        制作配方
      </h2>
      <div className="space-y-3">
        {recipes.map((recipe, index) => (
          <div key={recipe.id} className="space-y-3">
            {recipes.length > 1 && <h3 className="mb-3 text-sm font-medium">配方 {index + 1}</h3>}
            {recipe.materials === null ? (
              <p className="text-sm text-muted-foreground">材料信息未确认</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {recipe.materials.map((material) => (
                  <li key={material.itemId} className="max-w-full min-w-0">
                    <CollectionItemCard
                      item={material.item}
                      itemId={material.itemId}
                      quantity={material.quantity}
                      fallbackName="未知材料"
                      link={
                        material.item && material.item.browsable !== false
                          ? recordLocation(material.item)
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FurnitureSetMembers({ items }: { items: FurnitureItem[] }) {
  return (
    <section aria-labelledby="related-furniture" className="space-y-4">
      <h2 id="related-furniture" className="text-lg font-semibold">
        套组成员
      </h2>
      <FurnitureItemGrid items={items} />
    </section>
  );
}

function FurnitureItemGrid({ items }: { items: FurnitureItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
      {items.map((item) => (
        <FurnitureCard key={item.id} item={item} />
      ))}
    </div>
  );
}
