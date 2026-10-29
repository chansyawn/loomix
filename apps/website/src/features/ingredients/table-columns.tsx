import { Link } from "@tanstack/react-router";
import type { IngredientItem } from "../collection-view";
import { collectionItemLocation } from "../collection/item-route";
import { recordColumns, tableLinkClassName, textColumn } from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useDishesOrigin } from "../dishes/detail-navigation";
import { ingredientLeafTags } from "./model";
import type { IngredientsData } from "./model";

function IngredientLink({ item }: { item: IngredientItem }) {
  const origin = useDishesOrigin();
  return (
    <Link
      {...collectionItemLocation(item)}
      state={{ dishesOrigin: origin }}
      className={tableLinkClassName}
      title={item.name}
    >
      {item.name}
    </Link>
  );
}

export function ingredientTableColumns(data: IngredientsData): CollectionColumn<IngredientItem>[] {
  const [name] = recordColumns<IngredientItem>((item) => <IngredientLink item={item} />);
  return [
    { ...name!, header: "食材" },
    textColumn("tags", "标签", 320, (item) =>
      ingredientLeafTags(data, item.id)
        .map((tag) => tag.name)
        .join("、"),
    ),
    textColumn("recipes", "关联菜肴", 128, (item) => data.dishesByItemId.get(item.id)?.length ?? 0),
  ];
}
