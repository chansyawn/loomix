import { SproutIcon, LayersIcon } from "lucide-react";
import { CardDescription, CardFooter } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { View } from "./search";

export const title = "植物";
export const tabs: CollectionTab<"items" | "series">[] = [
  { value: "items", label: "植物单品", icon: <SproutIcon /> },
  { value: "series", label: "植物系列", icon: <LayersIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "种植物", searchLabel: "搜索植物名称", placeholder: "搜索植物名称…" },
    series: { unit: "个系列", searchLabel: "搜索系列名称", placeholder: "搜索系列名称…" },
  }[view];
  return {
    ...entry,
    grid: compactGrid(124),
    card:
      view === "items" ? (
        <CollectionCardSkeleton
          description={
            <CardDescription className="space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
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
