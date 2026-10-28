import { CarrotIcon, CookingPotIcon, LayersIcon } from "lucide-react";
import { CardDescription, CardFooter } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid, wideGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { DishView, View } from "./search";

export const title = "烹饪";
export const tabs: CollectionTab<View>[] = [
  { value: "items", label: "菜肴", icon: <CookingPotIcon /> },
  { value: "ingredients", label: "食材", icon: <CarrotIcon /> },
  { value: "series", label: "菜肴系列", icon: <LayersIcon /> },
];
export function listPresentation(view: DishView) {
  const entry = {
    items: { unit: "道菜肴", searchLabel: "搜索菜肴名称", placeholder: "搜索菜肴名称…" },
    series: { unit: "个系列", searchLabel: "搜索系列名称", placeholder: "搜索系列名称…" },
  }[view];
  return {
    ...entry,
    grid: view === "items" ? compactGrid(136) : wideGrid(120, 1),
    card:
      view === "items" ? (
        <CollectionCardSkeleton
          description={
            <CardDescription className="space-y-2">
              {
                <CardDescription className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardDescription>
              }
              <Skeleton className="h-4 w-2/3" />
            </CardDescription>
          }
        />
      ) : (
        <CollectionCardSkeleton
          footer={
            <CardFooter className="mt-auto gap-1.5">
              <Skeleton className="size-3.5" />
              <Skeleton className="h-4 w-20" />
            </CardFooter>
          }
        />
      ),
  };
}
