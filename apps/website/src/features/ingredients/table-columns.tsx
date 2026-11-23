import { Link } from "@tanstack/react-router";
import type { IngredientItem } from "../omnidex-view";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { recordColumns, tableLinkClassName, textColumn } from "../omnidex/table-columns";
import type { ListColumn } from "../omnidex/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { ingredientLeafTags } from "./model";
import type { IngredientsData } from "./model";

function IngredientLink({ item }: { item: IngredientItem }) {
  const origin = useOmnidexOrigin();
  return (
    <Link
      {...catalogEntryLocation(item)}
      state={{ omnidexOrigin: origin }}
      className={tableLinkClassName}
      title={item.name}
    >
      {item.name}
    </Link>
  );
}

export function ingredientTableColumns(data: IngredientsData): ListColumn<IngredientItem>[] {
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
