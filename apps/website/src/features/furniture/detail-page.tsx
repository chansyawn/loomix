import { FurnitureCard, FurnitureSetCard } from "./furniture-card";
import {
  CollectionDetailLayout,
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { CollectionItemCard } from "@/features/collection/collection-item-card";
import { collectionItemLocation } from "@/features/collection/item-route";
import type { FurnitureItem, FurnitureSet } from "../collection-view";
import type { FurnitureDetail } from "./detail";

export function FurnitureDetailPage({ detail }: { detail: FurnitureDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["类型", detail.record.type],
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
          scene={detail.kind === "set"}
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
      <FurnitureExtras detail={detail} />
    </CollectionDetailLayout>
  );
}

function FurnitureExtras({ detail }: { detail: FurnitureDetail }) {
  const sections: CollectionDetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.recipes?.length)
      sections.push({
        key: "furniture-recipes",
        content: <FurnitureRecipes recipes={detail.recipes} />,
      });
    if (detail.sets.length)
      sections.push({
        key: "furniture-memberships",
        content: <FurnitureMemberships sets={detail.sets} />,
      });
    if (detail.sameSetItems.length)
      sections.push({
        key: "same-set-furniture",
        content: <FurnitureSameSetItems items={detail.sameSetItems} />,
      });
  } else if (detail.items?.length) {
    sections.push({
      key: "furniture-set-members",
      content: <FurnitureSetMembers items={detail.items} />,
    });
  }
  return <CollectionDetailExtras sections={sections} />;
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
              <p className="text-sm text-muted-foreground">
                {recipe.unresolvedReason || "材料信息未确认"}
              </p>
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
                        material.item && material.item.listed !== false
                          ? collectionItemLocation(material.item)
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

function FurnitureMemberships({ sets }: { sets: FurnitureSet[] }) {
  return (
    <section aria-labelledby="related-furniture" className="space-y-4">
      <h2 id="related-furniture" className="text-lg font-semibold">
        所属套组
      </h2>
      <CollectionDetailRelatedGrid>
        {sets.map((set) => (
          <FurnitureSetCard key={set.id} set={set} />
        ))}
      </CollectionDetailRelatedGrid>
    </section>
  );
}

function FurnitureSameSetItems({ items }: { items: FurnitureItem[] }) {
  return (
    <section aria-labelledby="same-set-furniture" className="space-y-4">
      <h2 id="same-set-furniture" className="text-lg font-semibold">
        同组家具
      </h2>
      <FurnitureItemGrid items={items} />
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
