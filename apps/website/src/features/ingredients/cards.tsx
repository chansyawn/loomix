import { Link } from "@tanstack/react-router";
import type { IngredientItem } from "../collection-view";
import { CollectionCard } from "../collection/collection-card";
import { RecordImage } from "../collection/record-image";
import { collectionItemLocation } from "../collection/item-route";
import { useDishesOrigin } from "../dishes/detail-navigation";
import { CardDescription } from "@/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/table";
import type { CollectionLayout } from "../collection/layout";
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
      description={
        <CardDescription>{tags.map((tag) => tag.name).join(" · ") || "食材"}</CardDescription>
      }
      footer={<span>{data.dishesByItemId.get(item.id)?.length ?? 0} 道关联菜肴</span>}
    />
  );
}

export function IngredientItems({
  items,
  data,
  layout = "grid",
}: {
  items: IngredientItem[];
  data: IngredientsData;
  layout?: CollectionLayout;
}) {
  const origin = useDishesOrigin();
  if (layout === "table")
    return (
      <div className="overflow-x-auto rounded-xl border">
        <Table aria-label="食材列表">
          <TableHeader>
            <TableRow>
              <TableHead>食材</TableHead>
              <TableHead>标签</TableHead>
              <TableHead className="text-right whitespace-nowrap">关联菜肴</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="relative">
                <TableCell>
                  <Link
                    {...collectionItemLocation(item)}
                    state={{ dishesOrigin: origin }}
                    className="flex min-w-32 items-center gap-2 rounded-lg font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring after:absolute after:inset-0 after:rounded-lg"
                  >
                    <span className="w-10 shrink-0 overflow-hidden rounded-lg">
                      <RecordImage image={item.image} name={item.name} compact />
                    </span>
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ingredientLeafTags(data, item.id)
                    .map((tag) => tag.name)
                    .join("、")}
                </TableCell>
                <TableCell className="text-right">
                  {data.dishesByItemId.get(item.id)?.length ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
      {items.map((item) => (
        <IngredientCard key={item.id} item={item} data={data} />
      ))}
    </div>
  );
}
