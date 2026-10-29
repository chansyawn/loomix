import { Link } from "@tanstack/react-router";
import type { IngredientItem } from "../collection-view";
import { compactGrid } from "../collection/grid-layout";
import { CollectionCard } from "../collection/collection-card";
import { RecordImage } from "../collection/record-image";
import { collectionItemLocation } from "../collection/item-route";
import { useDishesOrigin } from "../dishes/detail-navigation";
import { ingredientLeafTags } from "./model";
import type { IngredientsData } from "./model";

function IngredientCard({ item, data }: { item: IngredientItem; data: IngredientsData }) {
  const origin = useDishesOrigin();
  const tags = ingredientLeafTags(data, item.id);
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage image={item.image} name={item.name} />}
      titleLink={
        <Link {...collectionItemLocation(item)} state={{ dishesOrigin: origin }}>
          {item.name}
        </Link>
      }
      tags={[
        tags.map((tag) => tag.name).join(" · ") || "食材",
        `${data.dishesByItemId.get(item.id)?.length ?? 0} 道关联菜肴`,
      ].join(" · ")}
    />
  );
}

export function IngredientItems({
  items,
  data,
}: {
  items: IngredientItem[];
  data: IngredientsData;
}) {
  return (
    <div className={compactGrid(78).className}>
      {items.map((item) => (
        <IngredientCard key={item.id} item={item} data={data} />
      ))}
    </div>
  );
}
