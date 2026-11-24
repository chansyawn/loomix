import { Link } from "@tanstack/react-router";
import type { IngredientItem } from "../omnidex-view";
import { RecordListCard } from "../omnidex/record-list-card";
import { RecordImage } from "../omnidex/record-image";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { ingredientLeafTags } from "./model";
import type { IngredientsData } from "./model";

export function IngredientCard({ item, data }: { item: IngredientItem; data: IngredientsData }) {
  const origin = useOmnidexOrigin();
  const tags = ingredientLeafTags(data, item.id);
  return (
    <RecordListCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage image={item.image} name={item.name} />}
      titleLink={
        <Link {...catalogEntryLocation(item)} state={{ omnidexOrigin: origin }}>
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
