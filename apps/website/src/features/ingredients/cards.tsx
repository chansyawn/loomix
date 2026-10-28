import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import type { IngredientCategory } from "@loomix/schema/catalog";
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
import type { IngredientsData } from "./model";
import { categoryItems } from "./query";
import { IngredientCategoryLink } from "./category-link";

export function IngredientCategoryCard({
  category,
  data,
}: {
  category: IngredientCategory;
  data: IngredientsData;
}) {
  const origin = useDishesOrigin();
  const items = categoryItems(data, category);
  const children = data.categories.filter(
    (entry) => entry.parentId === category.id && entry.itemIds.some((id) => data.itemsById.has(id)),
  );
  return (
    <Link
      to="/collection/dishes/ingredients/$id"
      params={{ id: String(category.id) }}
      state={{ dishesOrigin: origin }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <div aria-hidden="true" className="grid grid-cols-3 bg-muted/50 p-3 [&>div]:bg-transparent">
        {items.slice(0, 3).map((item) => (
          <RecordImage key={item.id} image={item.image} name={item.name} compact />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{category.name}</h3>
          <ArrowUpRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        </div>
        {children.length > 0 && (
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {children.map((child) => child.name).join("、")}
          </p>
        )}
        <p className="mt-auto pt-1 text-xs text-muted-foreground">
          {items.length} 种食材 · {data.dishesByCategoryId.get(category.id)?.length ?? 0} 道关联菜肴
        </p>
      </div>
    </Link>
  );
}

export function IngredientCategories({
  categories,
  data,
  layout,
}: {
  categories: IngredientCategory[];
  data: IngredientsData;
  layout: CollectionLayout;
}) {
  if (layout === "table")
    return (
      <div className="overflow-x-auto rounded-xl border">
        <Table aria-label="食材类别列表">
          <TableHeader>
            <TableRow>
              <TableHead>食材类别</TableHead>
              <TableHead className="text-right whitespace-nowrap">已收录食材</TableHead>
              <TableHead className="text-right whitespace-nowrap">关联菜肴</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <IngredientCategoryLink
                    category={category}
                    className="rounded-lg font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  />
                </TableCell>
                <TableCell className="text-right">{categoryItems(data, category).length}</TableCell>
                <TableCell className="text-right">
                  {data.dishesByCategoryId.get(category.id)?.length ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-4">
      {categories.map((category) => (
        <IngredientCategoryCard key={category.id} category={category} data={data} />
      ))}
    </div>
  );
}

function IngredientCard({ item, data }: { item: IngredientItem; data: IngredientsData }) {
  const origin = useDishesOrigin();
  const categories = (data.categoriesByItemId.get(item.id) ?? []).filter(
    (category) => data.dimensions.get(category.id) === "type",
  );
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
        <CardDescription className="line-clamp-2 text-xs leading-5">
          {categories.map((category) => category.name).join(" · ") || "食材"}
        </CardDescription>
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
              <TableHead>种类</TableHead>
              <TableHead className="text-right whitespace-nowrap">关联菜肴</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    {...collectionItemLocation(item)}
                    state={{ dishesOrigin: origin }}
                    className="flex min-w-32 items-center gap-2 rounded-lg font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="w-10 shrink-0 overflow-hidden rounded-lg">
                      <RecordImage image={item.image} name={item.name} compact />
                    </span>
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(data.categoriesByItemId.get(item.id) ?? [])
                    .filter((category) => data.dimensions.get(category.id) === "type")
                    .map((category) => category.name)
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
