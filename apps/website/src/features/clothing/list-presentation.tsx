import { ShirtIcon, LayersIcon, SparklesIcon } from "lucide-react";
import { CardContent, CardDescription, CardFooter } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";
import type { GridLayout } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { View } from "./search";

export const title = "服饰";
const setGrid: GridLayout = {
  breakpoints: [420, 740, 1040],
  className:
    "grid grid-cols-1 gap-4 @min-[420px]:grid-cols-2 @min-[740px]:grid-cols-3 @min-[1040px]:grid-cols-4",
  estimateHeight: (width) => width + 144,
};
const appearanceGrid: GridLayout = {
  breakpoints: [0, 540, 740, 940],
  className:
    "grid grid-cols-2 gap-4 @min-[540px]:grid-cols-3 @min-[740px]:grid-cols-4 @min-[940px]:grid-cols-5",
  estimateHeight: (width) => width + 80,
};
export const tabs: CollectionTab<"items" | "sets" | "appearances">[] = [
  { value: "items", label: "服装", icon: <ShirtIcon /> },
  { value: "sets", label: "套装", icon: <LayersIcon /> },
  { value: "appearances", label: "外观", icon: <SparklesIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "件服装", searchLabel: "搜索服装名称", placeholder: "搜索服装名称…" },
    sets: { unit: "个套装", searchLabel: "搜索套装名称", placeholder: "搜索套装名称…" },
    appearances: { unit: "项外观", searchLabel: "搜索外观名称", placeholder: "搜索外观名称…" },
  }[view];
  return {
    ...entry,
    grid: view === "items" ? compactGrid(80, true) : view === "sets" ? setGrid : appearanceGrid,
    card:
      view === "sets" ? (
        <CollectionCardSkeleton
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
      ) : (
        <CollectionCardSkeleton
          headerClassName="h-12 shrink-0"
          description={
            <CardDescription className="min-h-4">
              <Skeleton className="h-4 w-1/2" />
            </CardDescription>
          }
        />
      ),
  };
}
