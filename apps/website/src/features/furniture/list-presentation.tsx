import { ArmchairIcon, LayersIcon } from "lucide-react";
import { CardContent, CardDescription, CardFooter } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid, wideGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { View } from "./search";

export const title = "家具";
export const tabs: CollectionTab<"items" | "sets">[] = [
  { value: "items", label: "家具单件", icon: <ArmchairIcon /> },
  { value: "sets", label: "家具套组", icon: <LayersIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "件家具", searchLabel: "搜索家具名称", placeholder: "搜索家具名称…" },
    sets: { unit: "个套组", searchLabel: "搜索套组名称", placeholder: "搜索套组名称…" },
  }[view];
  return {
    ...entry,
    grid: view === "items" ? compactGrid(100) : wideGrid(180),
    card:
      view === "items" ? (
        <CollectionCardSkeleton
          description={
            <CardDescription>
              <Skeleton className="h-4 w-1/2" />
            </CardDescription>
          }
        />
      ) : (
        <CollectionCardSkeleton
          imageClassName="aspect-2/1"
          footer={
            <CardFooter className="mt-auto gap-1.5">
              <Skeleton className="size-3.5" />
              <Skeleton className="h-4 w-20" />
            </CardFooter>
          }
        >
          <CardContent>
            {
              <CardDescription className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardDescription>
            }
          </CardContent>
        </CollectionCardSkeleton>
      ),
  };
}
